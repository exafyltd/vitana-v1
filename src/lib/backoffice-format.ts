/** VTID-03849 — locale-aware formatting helpers shared by BackOffice screens (kept out of component files for fast refresh). */
import { fmtDate, fmtNumber } from "@/lib/locale-format";

/** Tenant policy amounts are AED (design gate §4.3); whole units only. */
export function formatAed(amount: number): string {
  return fmtNumber(amount, { style: "currency", currency: "AED", maximumFractionDigits: 0 });
}

/** ERPClaw stores `fiscal_year_start_month` as 1–12. */
export function monthName(month: number | null | undefined): string {
  if (!month || month < 1 || month > 12) return "—";
  return fmtDate(new Date(2000, month - 1, 1), { month: "long" });
}
