/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — the `src/lib/locale-format.ts`
 * calls the patient screens make (`formatDate(d, 'MMM dd, yyyy')`, `fmtDate`
 * with day/month/year), formatting in the member's catalog locale instead of
 * reading the web i18n singleton, plus locale number formatting for the
 * biomarker values and the sample figures.
 */
const intlLocale = (locale: string) => (locale === 'sr' ? 'sr-Latn' : locale);

/** `formatDate(date, 'MMM dd, yyyy')` — short month, two-digit day, year. */
export function formatReportDate(value: string, locale: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(intlLocale(locale), { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** `fmtDate(iso, { day: 'numeric', month: 'short', year: 'numeric' })`. */
export function formatShortDate(value: string, locale: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 6 }).format(value);
  } catch {
    return String(value);
  }
}
