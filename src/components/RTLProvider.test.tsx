/**
 * VTID-03701 — RTLProvider must derive direction from the SELECTED LANGUAGE,
 * not from its own disconnected local state.
 *
 * Before this fix, `isRTL` was a plain `useState(false)` with a manual
 * `toggleRTL()` nothing in the app ever called — so every Arabic session
 * rendered left-to-right regardless of the selected language. This is the
 * regression test for that: switching to Arabic must flip `document.dir`
 * without any manual toggle, and switching back to a LTR language must
 * flip it back.
 */
import { memo } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  catalogs: { 'de-DE': {}, 'ar-XA': {}, 'en-US': {} } as Record<string, Record<string, unknown>>,
  state: { locale: 'de-DE' },
  updatePreferences: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  catalogs: h.catalogs,
  ensureCatalog: vi.fn(async () => {}),
  onCatalogLoaded: () => () => {},
}));

vi.mock('@/lib/i18n-toast', () => ({
  setI18nLocale: (l: string) => {
    h.state.locale = l;
  },
  notifyI18nLocaleChanged: vi.fn(),
  t: (key: string) => key,
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

import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { RTLProvider, useRTL } from './RTLProvider';

const Screen = memo(function Screen() {
  const { setSelectedLanguage } = useLanguage();
  const { isRTL, toggleRTL } = useRTL();
  return (
    <div>
      <span data-testid="dir">{isRTL ? 'rtl' : 'ltr'}</span>
      <button onClick={() => setSelectedLanguage('ar-XA')}>ar</button>
      <button onClick={() => setSelectedLanguage('en-US')}>en</button>
      <button onClick={() => setSelectedLanguage('de-DE')}>de</button>
      <button onClick={toggleRTL}>toggle</button>
    </div>
  );
});

const go = async (id: string) => {
  await act(async () => {
    screen.getByText(id).click();
  });
};

describe('VTID-03701 RTLProvider follows the selected language', () => {
  beforeEach(() => {
    h.state.locale = 'de-DE';
    document.documentElement.dir = '';
    document.documentElement.classList.remove('rtl');
  });

  it('starts LTR for a non-RTL language, with no manual toggle involved', () => {
    render(
      <LanguageProvider>
        <RTLProvider>
          <Screen />
        </RTLProvider>
      </LanguageProvider>,
    );
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('flips to RTL automatically when the language changes to Arabic', async () => {
    render(
      <LanguageProvider>
        <RTLProvider>
          <Screen />
        </RTLProvider>
      </LanguageProvider>,
    );
    await go('ar');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.classList.contains('rtl')).toBe(true);
  });

  it('flips back to LTR when the language changes away from Arabic', async () => {
    render(
      <LanguageProvider>
        <RTLProvider>
          <Screen />
        </RTLProvider>
      </LanguageProvider>,
    );
    await go('ar');
    await go('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.classList.contains('rtl')).toBe(false);
  });

  it('a manual toggle still works as an override, and a later language change clears it', async () => {
    render(
      <LanguageProvider>
        <RTLProvider>
          <Screen />
        </RTLProvider>
      </LanguageProvider>,
    );
    // German is LTR; force RTL manually.
    await go('toggle');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');

    // Switching language (even to another LTR one) clears the stale override
    // instead of leaving the UI stuck on a dev toggle from a prior language.
    await go('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });
});
