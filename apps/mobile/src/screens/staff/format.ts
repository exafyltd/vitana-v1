/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — locale number formats
 * for the staff figures (the web prints `8`, `6.5h`, `12/18`, `4/5`, `5`, `2`
 * and `24` as literals in src/pages/staff/Dashboard.tsx and Queue.tsx; native
 * renders the same values in the member's locale).
 */
export function formatCount(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

/** `a/b`, as the web's `12/18` and `4/5`. */
export function formatRatio(a: number, b: number, locale: string): string {
  return `${formatCount(a, locale)}/${formatCount(b, locale)}`;
}

/** Hours with the narrow unit, as the web's `6.5h` (English); a runtime without unit support falls back to `<n>h`. */
export function formatHours(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'narrow' }).format(n);
  } catch {
    return `${formatCount(n, locale)}h`;
  }
}
