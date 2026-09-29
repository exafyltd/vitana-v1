import { describe, it, expect } from "vitest";
import { normalizeIndexStanding } from "./useIndexStanding";

describe("normalizeIndexStanding (VTID-04498)", () => {
  it("returns the rank when the server says show", () => {
    expect(normalizeIndexStanding({ show: true, top_percent: 11, cohort_size: 66 })).toEqual({ topPercent: 11, cohortSize: 66 });
  });

  it("returns null whenever the server does not vouch for a badge", () => {
    expect(normalizeIndexStanding(null)).toBeNull();
    expect(normalizeIndexStanding({ show: false, reason: "no_one_below", cohort_size: 66 })).toBeNull();
    expect(normalizeIndexStanding({ show: false, reason: "cohort_too_small", cohort_size: 7 })).toBeNull();
    expect(normalizeIndexStanding({ show: true })).toBeNull();
  });

  it("rejects values outside the top half or not whole numbers", () => {
    expect(normalizeIndexStanding({ show: true, top_percent: 51, cohort_size: 66 })).toBeNull();
    expect(normalizeIndexStanding({ show: true, top_percent: 0, cohort_size: 66 })).toBeNull();
    expect(normalizeIndexStanding({ show: true, top_percent: 12.5, cohort_size: 66 })).toBeNull();
    expect(normalizeIndexStanding({ show: true, top_percent: "12", cohort_size: 66 })).toBeNull();
  });
});
