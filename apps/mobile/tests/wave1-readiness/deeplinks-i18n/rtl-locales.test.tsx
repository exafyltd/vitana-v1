/**
 * VTID-05682 (native-wave1-readiness-tests/deeplinks-i18n, L5) — direction and locale
 * resolution for the 11 locales: `I18nProvider` (`initialLocale`), `isRTL`, the
 * `I18nManager.forceRTL` switch in `LanguageProvider` (mocked in this file), `translate`
 * fallback to `de`, and `localeFromDevice` (`expo-localization` mocked in this file).
 * The `tests/settings/i18n-rtl.test.tsx` file is not touched. Mocks only; readiness
 * evidence, not the Wave 1 exit (needs G1).
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import type { ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { FALLBACK_LOCALE, LOCALES, isRTL, localeFromDevice, translate } from '../../../src/i18n';
import { I18nProvider, languageFromLocale, localeFromLanguage, useI18n } from '../../../src/i18n/I18nProvider';
import { useLanguage } from '../../../src/identity/LanguageProvider';
import { createSupabaseDouble } from '../../helpers/supabase-double';
import { makeWrapper } from '../../helpers/providers';
import { __setSupabaseForTests } from '../../../src/auth/client';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => []) }));
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() }, usePathname: () => '/home' }));

const mockedLocales = getLocales as jest.Mock;

afterAll(() => __setSupabaseForTests(null));
beforeEach(() => {
  mockedLocales.mockReset();
  mockedLocales.mockReturnValue([]);
});

describe('direction per locale', () => {
  it.each([...LOCALES])('I18nProvider initialLocale=%s sets locale and direction (ar RTL, others LTR)', (locale) => {
    const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe(locale);
    expect(result.current.rtl).toBe(locale === 'ar');
    expect(result.current.rtl).toBe(isRTL(locale));
  });

  it.each([...LOCALES])('%s resolves a real string through the provider t()', (locale) => {
    const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t('common.loading')).toBe(translate(locale, 'common.loading'));
    expect(result.current.t('common.loading')).not.toBe('common.loading');
  });

  it.each([...LOCALES])('the web language value of %s maps back to the same catalog', (locale) => {
    expect(localeFromLanguage(languageFromLocale(locale))).toBe(locale);
  });

  describe('LanguageProvider drives I18nManager.forceRTL', () => {
    const original = Object.getOwnPropertyDescriptor(I18nManager, 'isRTL');
    let force: jest.SpyInstance;
    beforeEach(() => {
      force = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => undefined);
      Object.defineProperty(I18nManager, 'isRTL', { value: false, configurable: true, writable: true });
    });
    afterEach(() => {
      force.mockRestore();
      if (original) Object.defineProperty(I18nManager, 'isRTL', original);
    });

    it.each([...LOCALES])('%s: the RTL switch is requested only for ar', async (locale) => {
      const d = createSupabaseDouble();
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper({ client: d.client, language: languageFromLocale(locale) }) });
      await waitFor(() => expect(result.current.rtl).toBe(locale === 'ar'));
      if (locale === 'ar') expect(force).toHaveBeenCalledWith(true);
      else expect(force).not.toHaveBeenCalled();
    });
  });
});

describe('fallback to de', () => {
  it.each([['xx'], [''], ['de-DE'], ['AR']])('an unknown locale %p falls back to de', (unknown) => {
    expect(translate(unknown, 'common.loading')).toBe(translate('de', 'common.loading'));
  });

  it('an unknown locale is not RTL', () => {
    expect(isRTL('xx')).toBe(false);
    expect(isRTL('AR')).toBe(false);
  });

  it('a language value that is not shipped maps to de', () => {
    expect(localeFromLanguage('xx-YY')).toBe(FALLBACK_LOCALE);
    expect(localeFromLanguage(null)).toBe(FALLBACK_LOCALE);
    expect(localeFromLanguage('ar-XA')).toBe('ar');
  });
});

describe('localeFromDevice', () => {
  it('returns the first shipped device language', () => {
    mockedLocales.mockReturnValue([{ languageCode: 'xx' }, { languageCode: 'fr' }, { languageCode: 'ar' }]);
    expect(localeFromDevice()).toBe('fr');
  });

  it.each([...LOCALES])('a device in %s resolves to %s', (locale) => {
    mockedLocales.mockReturnValue([{ languageCode: locale }]);
    expect(localeFromDevice()).toBe(locale);
  });

  it.each([[[]], [[{ languageCode: 'ja' }, { languageCode: null }]]])('no shipped device language → de (%j)', (list) => {
    mockedLocales.mockReturnValue(list);
    expect(localeFromDevice()).toBe('de');
  });

  it('I18nProvider without initialLocale starts from the device locale', () => {
    mockedLocales.mockReturnValue([{ languageCode: 'ar' }]);
    const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe('ar');
    expect(result.current.rtl).toBe(true);
  });
});
