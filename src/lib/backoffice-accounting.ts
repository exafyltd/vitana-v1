/**
 * VTID-03857 — Accounting Read screens: ERPClaw journal / chart-of-accounts /
 * fiscal-period shapes (captured from a real ERPClaw-on-Postgres instance,
 * docs/validation/VTID-03857/outputs/erpclaw-shapes/) and the pure helpers the
 * screens share.
 */
import { num } from "@/lib/backoffice-sales";

export type ErpRootType = "asset" | "liability" | "equity" | "income" | "expense";
export const ROOT_TYPES: readonly ErpRootType[] = ["asset", "liability", "equity", "income", "expense"];

export interface ErpAccount {
  id: string; name: string; account_number: string | null; parent_id: string | null;
  root_type: ErpRootType | string; account_type: string | null; currency: string | null;
  is_group: number | boolean; is_frozen: number | boolean; disabled: number | boolean;
  balance_direction: string | null; depth?: number | null;
}
/** `get-account` adds the running balance to the same row. */
export interface ErpAccountDetail extends ErpAccount { balance: string | number; debit_total: string | number; credit_total: string | number }
export interface ErpAccountBalance { balance: string | number; debit_total: string | number; credit_total: string | number; currency: string | null }

export interface ErpJournalRow {
  id: string; naming_series: string | null; posting_date: string; entry_type: string | null;
  status: string; total_debit: string | number; total_credit: string | number; remark: string | null;
}
export interface ErpJournalLine {
  id: string; account_id: string; account_name: string | null; debit: string | number; credit: string | number;
  party_type: string | null; party_id: string | null; cost_center_id: string | null; project_id: string | null; remark: string | null;
}
export interface ErpJournalDetail extends ErpJournalRow { amended_from: string | null; company_id: string; lines: ErpJournalLine[] }

export interface ErpFiscalYear { id: string; name: string; start_date: string; end_date: string; is_closed: number | boolean }
export interface ErpGlIntegrity {
  balanced: boolean; total_debit: string | number; total_credit: string | number; difference: string | number;
  chain_intact: boolean; broken_links: number; total_entries: number;
}
export interface ErpPeriodValidation { fiscal_year: string; income_total: string | number; expense_total: string | number; net_income: string | number; trial_balance_balanced: boolean }
export interface ErpCostCenter { id: string; name: string; parent_id: string | null; is_group: number | boolean }

export const flag = (v: number | boolean | null | undefined): boolean => v === 1 || v === true;

export interface AccountTreeRow { account: ErpAccount; depth: number; hasChildren: boolean }

/**
 * Depth-first order for the chart of accounts: every parent directly above its
 * children, siblings by account number then name. Orphans (a parent that is not
 * in the list — a filtered view, or a truncated page) are treated as roots so
 * nothing silently disappears. `depth` is computed here, never trusted from the
 * row: ERPClaw fills it lazily and it is null on older accounts.
 */
export function flattenAccountTree(accounts: ErpAccount[]): AccountTreeRow[] {
  const ids = new Set(accounts.map((a) => a.id));
  const children = new Map<string | null, ErpAccount[]>();
  for (const a of accounts) {
    const parent = a.parent_id && ids.has(a.parent_id) ? a.parent_id : null;
    const list = children.get(parent) ?? [];
    list.push(a);
    children.set(parent, list);
  }
  const byNumber = (x: ErpAccount, y: ErpAccount) => (x.account_number ?? "").localeCompare(y.account_number ?? "", undefined, { numeric: true }) || x.name.localeCompare(y.name);
  const out: AccountTreeRow[] = [];
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    for (const a of (children.get(parent) ?? []).slice().sort(byNumber)) {
      if (seen.has(a.id)) continue; // a cycle can only come from corrupt data; never loop on it
      seen.add(a.id);
      const kids = children.get(a.id) ?? [];
      out.push({ account: a, depth, hasChildren: kids.length > 0 });
      walk(a.id, depth + 1, seen);
    }
  };
  const seen = new Set<string>();
  walk(null, 0, seen);
  // Anything still unvisited is only reachable through a cycle: surface it at root level rather than lose it.
  for (const a of accounts.slice().sort(byNumber)) if (!seen.has(a.id)) { seen.add(a.id); out.push({ account: a, depth: 0, hasChildren: (children.get(a.id) ?? []).length > 0 }); walk(a.id, 1, seen); }
  return out;
}

export interface ChartSummary { total: number; groups: number; ledgers: number; frozen: number; disabled: number; byRootType: Record<string, number> }

export function summarizeChart(accounts: ErpAccount[]): ChartSummary {
  const s: ChartSummary = { total: accounts.length, groups: 0, ledgers: 0, frozen: 0, disabled: 0, byRootType: {} };
  for (const a of accounts) {
    if (flag(a.is_group)) s.groups++; else s.ledgers++;
    if (flag(a.is_frozen)) s.frozen++;
    if (flag(a.disabled)) s.disabled++;
    s.byRootType[a.root_type] = (s.byRootType[a.root_type] ?? 0) + 1;
  }
  return s;
}

export interface JournalSummary { total: number; drafts: number; submitted: number; cancelled: number; postedDebit: number; unbalanced: number }

/** A journal entry is balanced when its debit and credit totals agree to the cent. */
export function isBalancedEntry(e: { total_debit: string | number; total_credit: string | number }): boolean {
  return Math.abs(num(e.total_debit) - num(e.total_credit)) < 0.005;
}

export function summarizeJournals(entries: ErpJournalRow[]): JournalSummary {
  const s: JournalSummary = { total: entries.length, drafts: 0, submitted: 0, cancelled: 0, postedDebit: 0, unbalanced: 0 };
  for (const e of entries) {
    const status = String(e.status ?? "").toLowerCase();
    if (status === "draft") s.drafts++;
    else if (status === "submitted") { s.submitted++; s.postedDebit += num(e.total_debit); }
    else if (status === "cancelled") s.cancelled++;
    if (!isBalancedEntry(e)) s.unbalanced++;
  }
  return s;
}

/** Lines of one journal entry, with the totals the detail panel shows under them. */
export function journalLineTotals(lines: ErpJournalLine[]): { debit: number; credit: number } {
  return lines.reduce((acc, l) => ({ debit: acc.debit + num(l.debit), credit: acc.credit + num(l.credit) }), { debit: 0, credit: 0 });
}

export type FiscalYearState = "closed" | "current" | "past" | "future";

/** ISO `YYYY-MM-DD` of a local date — fiscal-year bounds are calendar dates, not instants. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fiscalYearState(fy: ErpFiscalYear, today: Date = new Date()): FiscalYearState {
  if (flag(fy.is_closed)) return "closed";
  const t = isoDate(today);
  if (t < fy.start_date) return "future";
  if (t > fy.end_date) return "past";
  return "current";
}

/** The fiscal year the close screen should preselect: the current one, else the oldest still open, else none. */
export function defaultFiscalYear(years: ErpFiscalYear[], today: Date = new Date()): ErpFiscalYear | null {
  const open = years.filter((y) => !flag(y.is_closed)).slice().sort((a, b) => a.start_date.localeCompare(b.start_date));
  return open.find((y) => fiscalYearState(y, today) === "current") ?? open[0] ?? null;
}
