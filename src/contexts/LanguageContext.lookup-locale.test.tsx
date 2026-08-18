/**
 * VTID-03662 — `lookup()` strings must be in the language the page just
 * switched to, not the previous one.
 *
 * `lookup()` / `t()` from i18n-toast are plain function calls made DURING
 * render against a module-level locale that `setI18nLocale()` sets. That call
 * used to live in a `useEffect`, which runs AFTER the render it belongs to — so
 * the render caused by a language change resolved every lookup against the
 * OUTGOING locale, and nothing re-rendered afterwards to correct it, because
 * setI18nLocale writes a module variable and schedules no update.
 *
 * WHY THIS SURVIVED VTID-03660, WHICH TOUCHED THE SAME FILE
 * --------------------------------------------------------
 * The catalog-loaded event masks it on the FIRST visit to a locale: loading the
 * shards fires onCatalogLoaded, which forces exactly one extra render, and in
 * that render the module locale is finally current. So a fresh page switching
 * to one new language looks perfect. Only a locale that is ALREADY loaded
 * exposes it — and then the page renders in two languages at once.
 *
 * Measured in a real browser before the fix (the intro keyboard hint, a
 * lookup() string, beside the headline, a `t.` string):
 *
 *     1st visit to es -> Spanish   (catalog event masked it)
 *     back to de      -> Spanish   WRONG
 *     2nd visit to es -> German    WRONG
 *     1st visit to fr -> French    (masked again)
 *     3rd visit to es -> French    WRONG
 *
 * The tests below reproduce that sequence. The SECOND visit is the load-bearing
 * assertion: a test that only ever visits a locale once passes on the broken
 * code, which is exactly how this shipped.
 */
import { memo } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const catalogs: Record<string, Record<string, unknown>> = {
    'de-DE': { hint: { space: 'Leertaste' } },
    'es-ES': { hint: { space: 'Espacio' } },
    'fr-FR': { hint: { space: 'Espace' } },
  };
  // Every locale is pre-populated, so `ensureCatalog` never fires the
  // catalog-loaded event. That is deliberate: the event is what masks this bug,
  // and a test that lets it fire cannot see the defect at all.
  return {
    catalogs,
    // Stands in for i18n-toast's module-level `currentLocale` — the whole point
    // is that it is read during render and written by setI18nLocale.
    state: { locale: 'de-DE' },
    updatePreferences: vi.fn(),
  };
});

vi.mock('@/i18n', () => ({
  catalogs: h.catalogs,
  ensureCatalog: vi.fn(async () => {}),
  onCatalogLoaded: () => () => {},
}));

vi.mock('@/lib/i18n-toast', () => ({
  setI18nLocale: (l: string) => {
    h.state.locale = l;
  },
  // VTID-03663 — LanguageProvider calls this from an effect to wake memo'd
  // subscribers. This file has none (its Screen is memo'd but re-rendered by
  // the cascade), so a no-op is faithful; it is here because the provider
  // imports it.
  notifyI18nLocaleChanged: vi.fn(),
  // Same resolution shape as the real lookupRaw: primary locale, else de.
  t: (key: string) => {
    const path = key.split('.');
    for (const cat of [h.catalogs[h.state.locale], h.catalogs['de-DE']]) {
      let v: unknown = cat;
      let ok = true;
      for (const p of path) {
        if (v && typeof v === 'object' && p in (v as Record<string, unknown>)) {
          v = (v as Record<string, unknown>)[p];
        } else {
          ok = false;
          break;
        }
      }
      if (ok && typeof v === 'string') return v;
    }
    return key;
  },
}));

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
import { t as lookup } from '@/lib/i18n-toast';

// memo for the same reason as the catalog-refresh test: it makes the bailout
// deterministic, the way a real route-split tree does.
const Screen = memo(function Screen() {
  const { setSelectedLanguage } = useLanguage();
  return (
    <div>
      <span data-testid="hint">{lookup('hint.space')}</span>
      <button onClick={() => setSelectedLanguage('es-ES')}>es</button>
      <button onClick={() => setSelectedLanguage('fr-FR')}>fr</button>
      <button onClick={() => setSelectedLanguage('de-DE')}>de</button>
    </div>
  );
});

const hint = () => screen.getByTestId('hint').textContent;
const go = async (id: string) => {
  await act(async () => {
    screen.getByText(id).click();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('VTID-03662 lookup() renders the language just switched to', () => {
  beforeEach(() => {
    h.state.locale = 'de-DE';
  });

  it('switches on the FIRST visit to a locale', async () => {
    render(
      <LanguageProvider>
        <Screen />
      </LanguageProvider>,
    );
    expect(hint()).toBe('Leertaste');
    await go('es');
    expect(hint()).toBe('Espacio');
  });

  it('switches on a REPEAT visit to an already-loaded locale', async () => {
    render(
      <LanguageProvider>
        <Screen />
      </LanguageProvider>,
    );
    await go('es');
    await go('de');
    // Pre-fix this is 'Espacio' — the outgoing language, one render behind.
    expect(hint()).toBe('Leertaste');
    await go('es');
    expect(hint()).toBe('Espacio');
  });

  it('never renders a THIRD language it was never switched to', async () => {
    render(
      <LanguageProvider>
        <Screen />
      </LanguageProvider>,
    );
    await go('es');
    await go('fr');
    await go('es');
    // Pre-fix this is 'Espace' (French) while the user asked for Spanish —
    // the symptom that makes the page read as two languages at once.
    expect(hint()).toBe('Espacio');
    expect(hint()).not.toBe('Espace');
  });
});
