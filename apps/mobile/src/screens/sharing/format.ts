/**
 * VTID-05646 (native-wave2-sharing-business-r3/sharing) — date and number labels for the sharing
 * screens. The native port of `@/lib/locale-format` (which cannot cross the core bridge: its
 * `i18n-toast` import is class C): `Intl` with the viewer's locale, never a hardcoded one.
 */
export function formatDay(iso: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

export function formatClock(iso: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export function formatDayTime(iso: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export function formatNumber(n: number, locale: string, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, opts).format(n);
}

/** The "HH:mm" of a Date (the schedule sheet's time field). */
export function toHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
