import type { LegalLang } from '@/lib/use-scoped-t';

/**
 * VTID-04945: the connector privacy notice's language. German and English only
 * (owner decision 2026-10-07): ?lang=de|en wins; otherwise German for a German
 * app language and English for every other one.
 */
export function privacyLang(urlLang: string | null, selectedLanguage: string): LegalLang {
  if (urlLang === 'de' || urlLang === 'en') return urlLang;
  return selectedLanguage.startsWith('de') ? 'de' : 'en';
}
