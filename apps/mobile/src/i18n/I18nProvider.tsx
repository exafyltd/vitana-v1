/**
 * VTID-05157 — React binding for the native i18n module.
 *
 * VTID-05186 (N3, plan change 12): the provider also takes the member's
 * `language` in the web's form (`de-DE`, `ar-XA`, … — LanguageContext.tsx
 * values) and maps it to a catalog code; `rtl` follows `isRtlLanguage`. With
 * no `language` it keeps the Wave 0 behaviour (device locale, `setLocale`).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isRtlLanguage, languageOptions } from '../ports/core';
import { localeFromDevice, translate, isLocale, FALLBACK_LOCALE, type Locale, type Params } from './index';

type I18nValue = {
  locale: Locale;
  /** The web language value for `locale` (e.g. `de-DE`). */
  language: string;
  rtl: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

/** `ar-XA` → `ar`; an unknown value → `de` (the source of truth). */
export function localeFromLanguage(language: string | null | undefined): Locale {
  const base = (language ?? '').toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : FALLBACK_LOCALE;
}

/** `ar` → `ar-XA` (the languageOptions value for that catalog). */
export function languageFromLocale(locale: Locale): string {
  return languageOptions.find((o) => localeFromLanguage(o.value) === locale)?.value ?? 'de-DE';
}

export function I18nProvider({ children, initialLocale, language }: { children: ReactNode; initialLocale?: Locale; language?: string }) {
  const [own, setLocale] = useState<Locale>(() => initialLocale ?? localeFromDevice());
  const locale = language ? localeFromLanguage(language) : own;
  const lang = language ?? languageFromLocale(locale);
  const t = useCallback((key: string, params?: Params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, language: lang, rtl: isRtlLanguage(lang), setLocale, t }), [locale, lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
