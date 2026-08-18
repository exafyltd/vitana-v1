/**
 * VTID-03670 — the ORB voice widget (gateway's command-hub/orb-widget.js,
 * loaded by this app for the ORB button) reads the raw `vitana.lang`
 * localStorage key DIRECTLY. It has no access to LanguageContext, so it never
 * sees a `selectedLanguage` correction that only happens through React state.
 *
 * `setSelectedLanguage()` (the user-driven path) has always written
 * `vitana.lang` correctly. The two SERVER-DRIVEN sync effects — "initial sync
 * from server" and "keep runtime language in sync when preferences change
 * outside this Context" — only ever called `setLocalLanguage()` (React
 * state) and, in one branch, the NAMESPACED `getLocalStorageItem`/
 * `setLocalStorageItem` key (`vitana::global::<env>::language::selected_language`,
 * a DIFFERENT physical key). Neither touched `vitana.lang`.
 *
 * Concretely: a device/browser that has never called `setSelectedLanguage()`
 * on THIS profile (a fresh browser, cleared storage, a second device) has no
 * `vitana.lang` at all. The React app still resolves correctly — this exact
 * effect reads `preferences.stt_language` from the server and fixes
 * `selectedLanguage` — but the ORB widget, reading `vitana.lang` directly,
 * stays on its own fallback (`navigator.language`, then 'en'), producing a
 * spoken language that disagrees with what the user actually saved. Reported
 * live: ORB voice reverting to German after the user had selected English.
 *
 * These tests assert BOTH server-sync effects also write the raw
 * `vitana.lang` key, using vitest's real jsdom `localStorage` (not the
 * `@/lib/localStorage` module, which is mocked below the same way the
 * sibling LanguageContext test files already do).
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  preferences: null as { stt_language: string } | null,
  updatePreferences: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  catalogs: { 'de-DE': {}, 'en-US': {} },
  ensureCatalog: vi.fn(async () => {}),
  onCatalogLoaded: () => () => {},
}));

vi.mock('@/lib/i18n-toast', () => ({
  setI18nLocale: () => {},
  getI18nLocale: () => 'de-DE',
  notifyI18nLocaleChanged: () => {},
  useI18nLocale: () => 'de-DE',
  t: (k: string) => k,
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: h.preferences,
    updatePreferences: h.updatePreferences,
    isLoading: false,
  }),
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: h.user }) }));

// The NAMESPACED key module is mocked (mirrors the sibling test files) — it
// is deliberately NOT what these tests are about. `getLocalStorageItem`
// returning null means "no local override", so the effects take their
// server-wins branch, which is the one this VTID's fix touches.
vi.mock('@/lib/localStorage', () => ({
  getLocalStorageItem: () => null,
  setLocalStorageItem: vi.fn(),
}));

import { LanguageProvider, useLanguage } from './LanguageContext';

function Probe() {
  const { selectedLanguage } = useLanguage();
  return <span data-testid="probe">{selectedLanguage}</span>;
}

describe('VTID-03670: server-driven language sync also updates the raw vitana.lang key', () => {
  beforeEach(() => {
    localStorage.clear();
    h.user = { id: 'user-1' };
    h.preferences = null;
    h.updatePreferences.mockClear();
  });

  it('initial sync from server writes vitana.lang (fresh browser, no prior selection)', async () => {
    expect(localStorage.getItem('vitana.lang')).toBeNull();

    h.preferences = { stt_language: 'en-US' };
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('probe').textContent).toBe('en-US');
    expect(localStorage.getItem('vitana.lang')).toBe('en-US');
  });

  it('a later out-of-band preference change also refreshes vitana.lang', async () => {
    h.preferences = { stt_language: 'en-US' };
    const { rerender } = render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(localStorage.getItem('vitana.lang')).toBe('en-US');

    // Preferences change from a source outside this Context (e.g. the user
    // edited Voice Settings, which round-trips through the server) — a NEW
    // object identity, as a real refetch would produce.
    h.preferences = { stt_language: 'de-DE' };
    rerender(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('probe').textContent).toBe('de-DE');
    expect(localStorage.getItem('vitana.lang')).toBe('de-DE');
  });
});
