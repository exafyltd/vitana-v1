/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — locale-aware number, date
 * and region labels for the rewards screens. The web uses `fmtNumber` /
 * `fmtDate` / `fmtRegion` from `@/lib/locale-format` (class B: it imports the
 * web date-fns locale table), so they cannot cross the @vitana/core bridge;
 * Hermes ships `Intl`, so the native screens format from the viewer's locale
 * directly (same approach as screens/home/cards/time.ts).
 */
export function fmtNumber(locale: string, value: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value ?? 0);
}

/** Web `fmtDate(new Date(iso))` (toLocaleDateString defaults); '' for an unparseable date. */
export function fmtDate(locale: string, iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale).format(d);
}

/** Web `fmtRegion(code)`: the country name in the viewer's language, else the code. */
export function fmtRegion(locale: string, code: string): string {
  try {
    const DisplayNames = (Intl as unknown as { DisplayNames?: new (l: string[], o: { type: 'region' }) => { of: (c: string) => string | undefined } }).DisplayNames;
    return (DisplayNames ? new DisplayNames([locale], { type: 'region' }).of(code) : undefined) ?? code;
  } catch {
    return code;
  }
}
