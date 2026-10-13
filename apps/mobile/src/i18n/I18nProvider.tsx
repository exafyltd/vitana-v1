/**
 * VTID-05157 — React binding for the native i18n module.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { localeFromDevice, translate, isRTL, type Locale, type Params } from './index';

type I18nValue = {
  locale: Locale;
  rtl: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? localeFromDevice());
  const t = useCallback((key: string, params?: Params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, rtl: isRTL(locale), setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
