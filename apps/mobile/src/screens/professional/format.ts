/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — locale number
 * formats for the dashboard figures (the web prints `12`, `5` and `$24,500`
 * as literals in src/pages/professional/Dashboard.tsx; native renders the
 * same values in the member's locale).
 */
export function formatCount(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(n);
  } catch {
    return String(n);
  }
}

/** Whole US dollars, as the web's `$24,500`. */
export function formatUsd(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n}`;
  }
}
