/** VTID-05645 — date formatting for the Business Hub (Intl, never the raw locale calls the locale-format rule bans). */
export function formatDay(iso: string, locale: string, withTime = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatPlain(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}
