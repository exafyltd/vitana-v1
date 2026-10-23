/**
 * VTID-05297 (Native Wave 2, home-feed lane) — a locale-aware relative
 * timestamp for the feed cards. The web Home uses `formatDistanceToNow`
 * (`@/lib/locale-format`, class B — it imports the web date-fns locale table),
 * so it cannot cross the @vitana/core bridge. Hermes ships
 * `Intl.RelativeTimeFormat`, so the native cards format the "x minutes ago"
 * label from the viewer's locale directly. Returns '' for an unparseable date
 * (the card then simply omits the timestamp), matching the web's try/catch.
 */
export function formatTimeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  if (abs < minute) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / hour), 'hour');
  if (abs < week) return rtf.format(Math.round(diffMs / day), 'day');
  if (abs < month) return rtf.format(Math.round(diffMs / week), 'week');
  if (abs < year) return rtf.format(Math.round(diffMs / month), 'month');
  return rtf.format(Math.round(diffMs / year), 'year');
}
