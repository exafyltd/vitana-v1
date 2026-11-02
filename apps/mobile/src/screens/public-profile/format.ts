/**
 * VTID-05430 (Native Wave 2, public-profile lane) — locale-aware date / number
 * labels. The web uses `@/lib/locale-format` (`formatDate(d, 'MMM yyyy')`,
 * `fmtNumber`), which is class B (it imports the web date-fns locale table), so
 * the native screens format from the viewer's locale with Hermes' `Intl`
 * directly — the pattern src/screens/home/cards/time.ts follows. An
 * unparseable date yields '' (the row then omits it).
 */
export function formatMonthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}
