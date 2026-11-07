/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — locale-aware number
 * and date labels for the subscriptions screens. The web uses `fmtNumber` /
 * `fmtDate` from `@/lib/locale-format` (class B: it imports the web date-fns
 * locale table and the i18n singleton), so they cannot cross the @vitana/core
 * bridge; Hermes ships `Intl`, so the screens format from the viewer's
 * language (`useI18n().language`, e.g. `de-DE`) directly — the web reads the
 * same BCP-47 value (`currentBcp47()`).
 */
export function fmtNumber(language: string, value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(language, options);
}

/** Web `fmtDate(date, options)`: `toLocaleDateString(bcp47, options)`; '' for an unparseable date. */
export function fmtDate(language: string, iso: string, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString(language, options);
}
