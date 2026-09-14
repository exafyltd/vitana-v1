import { describe, expect, it } from "vitest";
import { agingTotals, netMargin, overdueShare, presetWindow, sortByAmountDesc, type ErpAgingRow } from "./backoffice-reports";

describe("presetWindow", () => {
  const today = new Date(2026, 8, 13); // 13 Sep 2026
  it("computes each preset as calendar dates", () => {
    expect(presetWindow("ytd", today)).toEqual({ from_date: "2026-01-01", to_date: "2026-09-13" });
    expect(presetWindow("this_month", today)).toEqual({ from_date: "2026-09-01", to_date: "2026-09-13" });
    expect(presetWindow("last_month", today)).toEqual({ from_date: "2026-08-01", to_date: "2026-08-31" });
    expect(presetWindow("this_quarter", today)).toEqual({ from_date: "2026-07-01", to_date: "2026-09-13" });
    expect(presetWindow("last_year", today)).toEqual({ from_date: "2025-01-01", to_date: "2025-12-31" });
  });
  it("last month crosses the year boundary in January", () => {
    expect(presetWindow("last_month", new Date(2026, 0, 5))).toEqual({ from_date: "2025-12-01", to_date: "2025-12-31" });
  });
});

describe("aging", () => {
  const row = (current: string, d30: string, d60: string, d90: string, d120: string, d120p: string): ErpAgingRow => ({ current, days_30: d30, days_60: d60, days_90: d90, days_120: d120, days_120_plus: d120p, total: String(num6(current, d30, d60, d90, d120, d120p)) });
  const num6 = (...v: string[]) => v.reduce((a, x) => a + Number(x), 0);
  it("sums buckets and totals across rows", () => {
    expect(agingTotals([row("100", "50", "0", "25", "0", "10"), row("0", "0", "5", "0", "0", "0")])).toEqual({ current: 100, days_30: 50, days_60: 5, days_90: 25, days_120: 0, days_120_plus: 10, total: 190 });
  });
  it("overdueShare counts everything past 30 days and guards a zero total", () => {
    expect(overdueShare([row("100", "50", "0", "25", "0", "25")])).toEqual({ overdue: 50, total: 200, ratio: 0.25 });
    expect(overdueShare([])).toEqual({ overdue: 0, total: 0, ratio: 0 });
    // a net-credit book (the spike's AR is -5000 with nothing overdue) must not render "-0%"
    expect(Object.is(overdueShare([row("-5000", "-5000", "0", "0", "0", "0")]).ratio, 0)).toBe(true);
    expect(overdueShare([row("-100", "0", "50", "0", "0", "0")]).ratio).toBe(1);
  });
});

describe("P&L helpers", () => {
  it("netMargin divides by income and is null without income", () => {
    expect(netMargin({ income_total: "47675.00", net_income: "47645.50" })).toBeCloseTo(0.99938, 4);
    expect(netMargin({ income_total: "0", net_income: "-29.50" })).toBeNull();
  });
  it("sortByAmountDesc orders by absolute amount, largest first, without mutating", () => {
    const lines = [{ amount: "5" }, { amount: "-50" }, { amount: "20" }];
    expect(sortByAmountDesc(lines).map((l) => l.amount)).toEqual(["-50", "20", "5"]);
    expect(lines[0].amount).toBe("5");
  });
});
