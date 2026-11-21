/**
 * VTID-05524 (native-wave2-role-modes-r2/business) — the `src/lib/locale-format.ts`
 * helpers the commerce screens use (`fmtDate`, `fmtDateTime`, `fmtRegion`) and
 * `countryOptions` (src/lib/commerce-countries.ts), formatting in the member's
 * app language (`useI18n().language`, e.g. `de-DE`) instead of reading the
 * web i18n singleton. An engine without `Intl.DisplayNames` shows the ISO
 * code, exactly like the web's own catch branch.
 */
import { getLocales } from 'expo-localization';
import { COUNTRY_CODES } from '../../ports/commerce';

export function fmtDate(value: string | number | Date, language: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(language);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function fmtDateTime(value: string | number | Date, language: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(language);
  } catch {
    return d.toISOString();
  }
}

export function fmtRegion(code: string, language: string): string {
  try {
    const DN = (Intl as unknown as { DisplayNames?: new (l: string[], o: { type: 'region' }) => { of: (c: string) => string | undefined } }).DisplayNames;
    if (!DN) return code;
    return new DN([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Codes with their localized names, alphabetical in the UI language. */
export function countryOptions(language: string): { code: string; name: string }[] {
  return COUNTRY_CODES.map((code) => ({ code, name: fmtRegion(code, language) })).sort((a, b) => a.name.localeCompare(b.name, language));
}

/** The device languages as BCP-47 tags (web `navigator.languages`), for `guessCountry`. */
export function deviceLanguages(): string[] {
  try {
    return getLocales()
      .map((l) => l.languageTag ?? '')
      .filter(Boolean);
  } catch {
    return [];
  }
}
