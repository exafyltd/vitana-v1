/**
 * VTID-03580 — "can I see the language selection on the landing page and choose
 * Spanish or French?"
 *
 * The honest answer at the time was no. The flag button existed and worked, but
 * it was a hardcoded DE <-> EN toggle: it imported two flags and computed
 * `isGerman ? 'en-US' : 'de-DE'`, never reading the language list. Eight
 * complete GA catalogs were reachable only by signing up in German and finding
 * Settings.
 *
 * These tests are written against that question rather than against the
 * implementation: they assert a user can SEE every shipped language and CHOOSE
 * one, so a future refactor back to a two-way toggle fails here regardless of
 * how it is coded.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setSelectedLanguage = vi.fn();
let currentLanguage = 'de-DE';

// The real context pulls in Supabase, auth and the whole catalog loader. The
// component's contract with it is three values, so that is what is faked —
// but `getVisibleLanguageOptions` is deliberately NOT faked below; the real
// GA filter is imported, so promoting a locale changes these tests' data.
vi.mock('@/contexts/LanguageContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/LanguageContext')>(
    '@/contexts/LanguageContext',
  );
  return {
    ...actual,
    useLanguage: () => ({
      selectedLanguage: currentLanguage,
      setSelectedLanguage,
      languageOptions: actual.languageOptions,
      isLoading: false,
    }),
  };
});

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: { intro: { chooseLanguage: 'Sprache wählen' } }, isGerman: true }),
}));

import { LanguageToggleButton } from './language-toggle-button';
import { languageOptions } from '@/contexts/LanguageContext';

const GA_ENDONYMS = [
  'Deutsch',
  'English',
  'Español',
  'Srpski',
  'Français',
  'Português (BR)',
  'Русский',
  'Polski',
  // VTID-03701 — ar/zh/tr promoted to ga once all six promotion-gate
  // surfaces (including db-content) passed.
  'العربية',
  '简体中文',
  'Türkçe',
];

function openPicker() {
  render(<LanguageToggleButton />);
  fireEvent.click(screen.getByRole('button', { name: 'Sprache wählen' }));
}

// "Português (BR)" contains regex metacharacters — unescaped, `(BR)` is a
// capture group and the pattern silently looks for "Português BR", which
// matches nothing. Escape before building the matcher.
const exact = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

describe('VTID-03580 landing-page language picker', () => {
  beforeEach(() => {
    setSelectedLanguage.mockClear();
    currentLanguage = 'de-DE';
  });

  it('offers every GA language, not just German and English', () => {
    openPicker();
    for (const name of GA_ENDONYMS) {
      expect(screen.getByRole('option', { name: exact(name) })).toBeTruthy();
    }
    // The count is asserted too: listing the eight above would still pass if a
    // ninth appeared, and a locale showing up here that is not GA would mean
    // the ?i18n-preview filter had been bypassed.
    expect(screen.getAllByRole('option')).toHaveLength(GA_ENDONYMS.length);
  });

  it('switches to Spanish when Spanish is chosen', () => {
    openPicker();
    fireEvent.click(screen.getByRole('option', { name: /Español/ }));
    expect(setSelectedLanguage).toHaveBeenCalledWith('es-ES');
  });

  it('switches to French when French is chosen', () => {
    openPicker();
    fireEvent.click(screen.getByRole('option', { name: /Français/ }));
    expect(setSelectedLanguage).toHaveBeenCalledWith('fr-FR');
  });

  it('reaches a language that the old DE<->EN toggle could not', () => {
    // The regression guard proper. Under the old component every click
    // produced 'en-US' or 'de-DE' and nothing else, so this assertion is the
    // one that fails if anyone reintroduces a two-way toggle.
    openPicker();
    fireEvent.click(screen.getByRole('option', { name: /Polski/ }));
    const [[picked]] = setSelectedLanguage.mock.calls;
    expect(picked).toBe('pl-PL');
    expect(['de-DE', 'en-US']).not.toContain(picked);
  });

  it('marks the active language as selected rather than offering it blindly', () => {
    currentLanguage = 'fr-FR';
    openPicker();
    expect(screen.getByRole('option', { name: /Français/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('option', { name: /Deutsch/ }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('closes on Escape, so the picker cannot trap a visitor on the first screen', () => {
    openPicker();
    expect(screen.queryByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('keeps the picker in step with the GA list instead of hardcoding it', () => {
    // Guards the drift this programme has already paid for twice (picker vs
    // supported_locales, translator rule vs checker rule). If a locale is
    // promoted to `ga` and this component does not show it, that is the bug.
    const gaCount = languageOptions.filter((o) => o.status === 'ga').length;
    openPicker();
    expect(screen.getAllByRole('option')).toHaveLength(gaCount);
  });
});
