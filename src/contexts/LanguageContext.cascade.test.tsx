/**
 * VTID-03663 — a language change must reach components that subscribe to
 * nothing.
 *
 * `lookup()` / `t()` from i18n-toast are plain function calls, not hooks, so a
 * component rendering them subscribes to nothing on its own. 614 of the 701
 * components that render catalog strings are in exactly that shape. React only
 * re-renders CONSUMERS when a context value changes, so those 614 kept the
 * outgoing language until something unrelated re-rendered them — the page in
 * two languages at once.
 *
 * WHY THE SUBTREE DOES NOT RE-RENDER ON ITS OWN
 * --------------------------------------------
 * `children` is created once in main.tsx and handed to the provider as a prop.
 * On a provider re-render `oldProps.children === newProps.children`, so React
 * bails out of the whole subtree before reaching any descendant. Cloning the
 * child with a prop that changes defeats that bailout, and the cascade then
 * propagates naturally because each component's render creates fresh elements.
 *
 * These tests assert BOTH halves, because they fail independently:
 *   1. a deep non-subscriber follows a language change (the cascade), and
 *   2. it does so WITHOUT being remounted (state survives).
 *
 * (2) is not a nicety. The one-line alternative — keying the subtree on the
 * locale — also makes (1) pass, while silently destroying every component's
 * state, scroll position and half-typed form input. A test suite that only
 * checked (1) would wave that through.
 */
import { memo, useState, createElement, type ReactElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  catalogs: {
    'de-DE': { hint: 'Leertaste' },
    'es-ES': { hint: 'Espacio' },
  } as Record<string, Record<string, unknown>>,
  state: { locale: 'de-DE' },
  listeners: new Set<() => void>(),
  updatePreferences: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  catalogs: h.catalogs,
  ensureCatalog: vi.fn(async () => {}),
  onCatalogLoaded: () => () => {},
}));

// Mirrors the real module: a bare function reading a module-level locale, plus
// the notify/subscribe pair that memo'd components use.
vi.mock('@/lib/i18n-toast', async () => {
  const { useSyncExternalStore } = await import('react');
  const get = () => h.state.locale;
  return {
    setI18nLocale: (l: string) => {
      h.state.locale = l;
    },
    getI18nLocale: get,
    notifyI18nLocaleChanged: () => {
      for (const cb of h.listeners) cb();
    },
    useI18nLocale: () =>
      useSyncExternalStore(
        (cb: () => void) => {
          h.listeners.add(cb);
          return () => h.listeners.delete(cb);
        },
        get,
        get,
      ),
    t: (k: string) =>
      String((h.catalogs[h.state.locale] ?? h.catalogs['de-DE'])[k] ?? k),
  };
});

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: null,
    updatePreferences: h.updatePreferences,
    isLoading: false,
  }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/localStorage', () => ({
  getLocalStorageItem: () => null,
  setLocalStorageItem: vi.fn(),
}));

import { LanguageProvider, useLanguage } from './LanguageContext';
import { t, useI18nLocale } from '@/lib/i18n-toast';

/** Subscribes to nothing and renders a catalog string — the 614-component shape. */
function Leaf() {
  // Local state, so a remount is detectable: it resets to 0.
  const [ticks] = useState(() => ++Leaf.mounts);
  return (
    <span data-testid="leaf">
      {t('hint')}#{ticks}
    </span>
  );
}
Leaf.mounts = 0;

/** Depth, so this is not a parent-child special case. */
const Mid = () => <Leaf />;
const Deep = () => <Mid />;

/** memo'd and subscribing — the case the cascade cannot reach. */
const MemoSubscriber = memo(function MemoSubscriber() {
  useI18nLocale();
  return <span data-testid="memo-sub">{t('hint')}</span>;
});

/** memo'd and NOT subscribing — kept to pin the known limitation honestly. */
const MemoBare = memo(function MemoBare() {
  return <span data-testid="memo-bare">{t('hint')}</span>;
});

function Switcher() {
  const { setSelectedLanguage } = useLanguage();
  return <button onClick={() => setSelectedLanguage('es-ES')}>go</button>;
}

function Tree() {
  return (
    <>
      <Deep />
      <MemoSubscriber />
      <MemoBare />
      <Switcher />
    </>
  );
}

const leafText = () => screen.getByTestId('leaf').textContent ?? '';

describe('VTID-03663 a language change reaches components that subscribe to nothing', () => {
  beforeEach(() => {
    h.state.locale = 'de-DE';
    h.listeners.clear();
    Leaf.mounts = 0;
  });

  it('cascades into a deep non-subscribing descendant', async () => {
    // children created ONCE and passed as a prop, exactly as main.tsx does —
    // this is what makes React bail out, so the test must reproduce it.
    const kids: ReactElement = createElement(Tree);
    render(<LanguageProvider>{kids}</LanguageProvider>);
    expect(leafText()).toBe('Leertaste#1');

    await act(async () => {
      screen.getByText('go').click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Pre-fix: still 'Leertaste#1'. The catalog was reachable the whole time;
    // nothing asked it again.
    expect(leafText()).toBe('Espacio#1');
  });

  it('does NOT remount the subtree — component state survives the switch', async () => {
    const kids: ReactElement = createElement(Tree);
    render(<LanguageProvider>{kids}</LanguageProvider>);
    await act(async () => {
      screen.getByText('go').click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // '#1' means the SAME fiber re-rendered. A keyed remount would mount a
    // second Leaf and read '#2' — and would have thrown away every unsaved
    // input in the app to change one word.
    expect(leafText()).toBe('Espacio#1');
    expect(Leaf.mounts).toBe(1);
  });

  it('reaches a memo-wrapped component through useI18nLocale()', async () => {
    const kids: ReactElement = createElement(Tree);
    render(<LanguageProvider>{kids}</LanguageProvider>);
    expect(screen.getByTestId('memo-sub').textContent).toBe('Leertaste');

    await act(async () => {
      screen.getByText('go').click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('memo-sub').textContent).toBe('Espacio');
  });

  it('documents the limitation: a memo-wrapped NON-subscriber is not reached', async () => {
    const kids: ReactElement = createElement(Tree);
    render(<LanguageProvider>{kids}</LanguageProvider>);
    await act(async () => {
      screen.getByText('go').click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Asserted rather than hidden. React.memo bails out on shallow-equal props
    // and the locale is not one of them, so no amount of parent re-rendering
    // reaches this component — the fix has to be the subscription, which is why
    // scripts/check-i18n-subscriptions.mjs fails CI on this exact shape.
    expect(screen.getByTestId('memo-bare').textContent).toBe('Leertaste');
  });
});
