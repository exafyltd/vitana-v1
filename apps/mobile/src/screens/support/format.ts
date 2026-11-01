/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — locale-format twins of
 * the web `@/lib/locale-format` helpers these screens use (`fmtDate`,
 * `fmtDateTime`, `formatDistanceToNow`). The web module is class B (date-fns
 * locale tables + the web language context), so the native screens format from
 * the viewer's catalog locale with Hermes' `Intl`. An unparseable value gives ''.
 */
function valid(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** `fmtDate(iso, { dateStyle: 'medium' })`. */
export function formatDate(iso: string, locale: string): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d) : '';
}

/** `fmtDateTime(date)`. */
export function formatDateTime(iso: string, locale: string): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d) : '';
}

/** `formatDistanceToNow(date, { addSuffix: true })`. */
export function formatAgo(iso: string, locale: string): string {
  const d = valid(iso);
  if (!d) return '';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) return rtf.format(Math.round(diff / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(diff / day), 'day');
  if (abs < 365 * day) return rtf.format(Math.round(diff / (30 * day)), 'month');
  return rtf.format(Math.round(diff / (365 * day)), 'year');
}
