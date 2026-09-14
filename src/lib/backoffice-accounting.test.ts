import { describe, expect, it } from "vitest";
import { defaultFiscalYear, fiscalYearState, flattenAccountTree, isBalancedEntry, journalLineTotals, summarizeChart, summarizeJournals, type ErpAccount, type ErpFiscalYear, type ErpJournalRow } from "./backoffice-accounting";

const acc = (id: string, number: string, parent: string | null, extra: Partial<ErpAccount> = {}): ErpAccount => ({
  id, name: `Account ${number}`, account_number: number, parent_id: parent, root_type: "asset", account_type: null, currency: "AED",
  is_group: parent === null ? 1 : 0, is_frozen: 0, disabled: 0, balance_direction: "debit_normal", depth: null, ...extra,
});

describe("flattenAccountTree", () => {
  it("orders parents above children, siblings by account number, and computes depth itself", () => {
    const rows = flattenAccountTree([acc("c", "1120", "b"), acc("a", "1000", null), acc("b", "1100", "a", { is_group: 1 }), acc("d", "1110", "b"), acc("e", "2000", null)]);
    expect(rows.map((r) => `${r.account.account_number}@${r.depth}`)).toEqual(["1000@0", "1100@1", "1110@2", "1120@2", "2000@0"]);
    expect(rows.find((r) => r.account.id === "b")?.hasChildren).toBe(true);
    expect(rows.find((r) => r.account.id === "d")?.hasChildren).toBe(false);
  });
  it("treats an orphan (parent not in the list) as a root instead of dropping it", () => {
    const rows = flattenAccountTree([acc("x", "5300", "missing-parent")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].depth).toBe(0);
  });
  it("never loops on a parent cycle", () => {
    const rows = flattenAccountTree([acc("a", "1", "b"), acc("b", "2", "a")]);
    expect(rows).toHaveLength(2);
  });
});

describe("summarizeChart", () => {
  it("counts groups, ledgers, frozen, disabled and root types with ERPClaw integer booleans", () => {
    const s = summarizeChart([acc("a", "1000", null), acc("b", "1100", "a", { is_frozen: 1 }), acc("c", "4000", null, { root_type: "income", disabled: true, is_group: 0 })]);
    expect(s).toEqual({ total: 3, groups: 1, ledgers: 2, frozen: 1, disabled: 1, byRootType: { asset: 2, income: 1 } });
  });
});

describe("journals", () => {
  const je = (status: string, debit: string, credit = debit): ErpJournalRow => ({ id: status + debit, naming_series: null, posting_date: "2026-09-13", entry_type: "journal", status, total_debit: debit, total_credit: credit, remark: null });
  it("summarizes by status, sums posted debit for submitted entries only, flags unbalanced ones", () => {
    const s = summarizeJournals([je("draft", "10.00"), je("submitted", "2530.00"), je("submitted", "12.50"), je("cancelled", "12.50"), je("submitted", "5.00", "4.00")]);
    expect(s).toEqual({ total: 5, drafts: 1, submitted: 3, cancelled: 1, postedDebit: 2547.5, unbalanced: 1 });
  });
  it("isBalancedEntry tolerates sub-cent rounding only", () => {
    expect(isBalancedEntry({ total_debit: "12.50", total_credit: "12.50" })).toBe(true);
    expect(isBalancedEntry({ total_debit: "12.504", total_credit: "12.50" })).toBe(true);
    expect(isBalancedEntry({ total_debit: "12.51", total_credit: "12.50" })).toBe(false);
  });
  it("journalLineTotals sums both sides", () => {
    expect(journalLineTotals([{ id: "1", account_id: "a", account_name: null, debit: "0.00", credit: "12.50", party_type: null, party_id: null, cost_center_id: null, project_id: null, remark: null }, { id: "2", account_id: "b", account_name: null, debit: "12.50", credit: "0.00", party_type: null, party_id: null, cost_center_id: null, project_id: null, remark: null }])).toEqual({ debit: 12.5, credit: 12.5 });
  });
});

describe("fiscal years", () => {
  const fy = (id: string, start: string, end: string, closed = 0): ErpFiscalYear => ({ id, name: id, start_date: start, end_date: end, is_closed: closed });
  const today = new Date(2026, 8, 13);
  it("classifies closed / current / past / future", () => {
    expect(fiscalYearState(fy("a", "2026-01-01", "2026-12-31"), today)).toBe("current");
    expect(fiscalYearState(fy("b", "2025-01-01", "2025-12-31"), today)).toBe("past");
    expect(fiscalYearState(fy("c", "2027-01-01", "2027-12-31"), today)).toBe("future");
    expect(fiscalYearState(fy("d", "2026-01-01", "2026-12-31", 1), today)).toBe("closed");
  });
  it("defaultFiscalYear prefers the current open year, then the oldest open one, else null", () => {
    const cur = fy("cur", "2026-01-01", "2026-12-31"), past = fy("past", "2025-01-01", "2025-12-31"), older = fy("older", "2024-01-01", "2024-12-31");
    expect(defaultFiscalYear([past, cur], today)?.id).toBe("cur");
    expect(defaultFiscalYear([past, older], today)?.id).toBe("older");
    expect(defaultFiscalYear([fy("x", "2026-01-01", "2026-12-31", 1)], today)).toBeNull();
  });
});
