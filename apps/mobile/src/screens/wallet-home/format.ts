/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — locale-aware number and date
 * labels for the wallet screens. The web uses `fmtNumber` / `fmtDate` /
 * `formatDate` from `@/lib/locale-format` (class B: it imports the web
 * date-fns locale table), so they cannot cross the @vitana/core bridge; Hermes
 * ships `Intl`, so the native screens format from the viewer's locale
 * directly, the same approach as screens/home/cards/time.ts.
 */
export function fmtNumber(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Signed amount: "+25" / "-10" (web `${amount > 0 ? '+' : ''}${fmtNumber(amount)}`). */
export function fmtSigned(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  return `${value > 0 ? '+' : ''}${fmtNumber(locale, value, options)}`;
}

/** Web `formatDate(date, 'MMM d, h:mm a')` / `fmtDate(date)`; '' for an unparseable date. */
export function fmtDateTime(locale: string, iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}
