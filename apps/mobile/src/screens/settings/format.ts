/**
 * VTID-05431 (Native Wave 2, settings lane) — the two `src/lib/locale-format.ts`
 * helpers the settings screens use (`fmtDate`, `fmtNumber`), formatting in the
 * member's catalog locale instead of reading the web i18n singleton.
 */
export function formatDate(value: string | Date, locale: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(locale);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}
