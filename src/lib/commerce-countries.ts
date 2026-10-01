/**
 * VTID-04793 — countries a supplier can register from. ISO 3166-1 alpha-2,
 * the format `partner_organizations.country` stores (CHECK `^[A-Z]{2}$`).
 * Names come from the runtime in the UI language (`fmtRegion`), so there is
 * no per-language country catalog to keep in sync.
 */
import { fmtRegion } from '@/lib/locale-format';

export const COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ ' +
  'CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR ' +
  'GA GB GD GE GH GI GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE ' +
  'KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO ' +
  'MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO ' +
  'RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT ' +
  'TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'
).split(' ');

/** Codes with their localized names, alphabetical in the UI language. */
export function countryOptions(): { code: string; name: string }[] {
  return COUNTRY_CODES.map((code) => ({ code, name: fmtRegion(code) })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** A sensible preselection: the region of the browser language, if it is a known code. */
export function guessCountry(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? []): string {
  for (const lang of languages) {
    const region = lang.split('-')[1]?.toUpperCase();
    if (region && COUNTRY_CODES.includes(region)) return region;
  }
  return '';
}
