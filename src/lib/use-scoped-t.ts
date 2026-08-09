import { useCallback, useEffect } from 'react';
import { catalogs, ensureCatalog } from '@/i18n';
import { t as globalT } from '@/lib/i18n-toast';

export type LegalLang = 'de' | 'en';

const LOCALE_KEY: Record<LegalLang, string> = {
  de: 'de-DE',
  en: 'en-US',
};

function resolveOnce(catalog: Record<string, unknown>, key: string): string | null {
  const parts = key.split('.');
  let v: unknown = catalog;
  for (const p of parts) {
    if (v && typeof v === 'object' && p in (v as Record<string, unknown>)) {
      v = (v as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof v === 'string' ? v : null;
}

function applyParams(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  let out = s;
  for (const [k, v] of Object.entries(params)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

export function useScopedT(lang: LegalLang | null) {
  // en/ar catalogs are lazy-loaded (VTID-03255). This hook is driven by an
  // explicit `lang` prop independent of the app's selected language, so make
  // sure the requested locale's catalog is fetched; until it lands, resolveOnce
  // falls back to de. LanguageProvider's onCatalogLoaded re-renders the tree.
  useEffect(() => {
    if (lang) void ensureCatalog(LOCALE_KEY[lang]);
  }, [lang]);

  return useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (!lang) return globalT(key, params);
      const catalog = catalogs[LOCALE_KEY[lang]] ?? catalogs['de-DE'];
      const fallback = catalogs['de-DE'];
      const value = resolveOnce(catalog, key) ?? resolveOnce(fallback, key) ?? key;
      return applyParams(value, params);
    },
    [lang],
  );
}
