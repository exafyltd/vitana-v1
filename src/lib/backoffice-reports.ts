/**
 * VTID-03858 — Reports Read screens: ERPClaw P&L / aging shapes (captured from a
 * real ERPClaw-on-Postgres instance, docs/validation/VTID-03858/outputs/erpclaw-shapes/)
 * and the pure helpers the screens share.
 */
import { num } from "@/lib/backoffice-sales";
import { isoDate } from "@/lib/backoffice-accounting";

export interface ErpPnlLine { account: string; account_id: string; amount: string | number }
export interface ErpPnl { period: string; income: ErpPnlLine[]; income_total: string | number; expenses: ErpPnlLine[]; expense_total: string | number; net_income: string | number }

export const AGING_BUCKETS = ["current", "days_30", "days_60", "days_90", "days_120", "days_120_plus"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];
export type ErpAgingRow = { [K in AgingBucket]: string | number } & { total: string | number };
export interface ErpArAgingRow extends ErpAgingRow { customer_id: string; customer_name: string | null }
export interface ErpApAgingRow extends ErpAgingRow { supplier_id: string; supplier_name: string | null }
export interface ErpArAging { as_of_date: string; total_outstanding: string | number; customers: ErpArAgingRow[] }
export interface ErpApAging { as_of_date: string; total_outstanding: string | number; suppliers: ErpApAgingRow[] }

export type ReportPreset = "ytd" | "this_month" | "last_month" | "this_quarter" | "last_year";
export const REPORT_PRESETS: readonly ReportPreset[] = ["ytd", "this_month", "last_month", "this_quarter", "last_year"];

/** `profit-and-loss` needs `--from-date`/`--to-date`; the screen offers presets rather than free dates in the Read slice. */
export function presetWindow(preset: ReportPreset, today: Date = new Date()): { from_date: string; to_date: string } {
  const y = today.getFullYear(), m = today.getMonth();
  const range = (from: Date, to: Date) => ({ from_date: isoDate(from), to_date: isoDate(to) });
  switch (preset) {
    case "this_month": return range(new Date(y, m, 1), today);
    case "last_month": return range(new Date(y, m - 1, 1), new Date(y, m, 0));
    case "this_quarter": return range(new Date(y, m - (m % 3), 1), today);
    case "last_year": return range(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31));
    case "ytd": default: return range(new Date(y, 0, 1), today);
  }
}

/** Sum of every bucket across rows plus a grand total — what the aging table's footer shows. */
export function agingTotals(rows: ErpAgingRow[]): Record<AgingBucket | "total", number> {
  const out = { current: 0, days_30: 0, days_60: 0, days_90: 0, days_120: 0, days_120_plus: 0, total: 0 };
  for (const r of rows) {
    for (const b of AGING_BUCKETS) out[b] += num(r[b]);
    out.total += num(r.total);
  }
  return out;
}

/** Everything past 30 days is "overdue" for the KPI; `current` and `days_30` are within terms. */
export function overdueShare(rows: ErpAgingRow[]): { overdue: number; total: number; ratio: number } {
  const t = agingTotals(rows);
  const overdue = t.days_60 + t.days_90 + t.days_120 + t.days_120_plus;
  // A net-credit book (total < 0) still has a meaningful share; divide by the magnitude and never return -0.
  const ratio = t.total !== 0 ? overdue / Math.abs(t.total) : 0;
  return { overdue, total: t.total, ratio: ratio === 0 ? 0 : ratio };
}

/** Margin as a fraction of income; null when there is no income to divide by. */
export function netMargin(pnl: Pick<ErpPnl, "income_total" | "net_income">): number | null {
  const income = num(pnl.income_total);
  return income !== 0 ? num(pnl.net_income) / income : null;
}

/** Sort report lines largest-first so the table reads like a statement, not a chart of accounts. */
export function sortByAmountDesc<T extends { amount: string | number }>(lines: T[]): T[] {
  return lines.slice().sort((a, b) => Math.abs(num(b.amount)) - Math.abs(num(a.amount)));
}
