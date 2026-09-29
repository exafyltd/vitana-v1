import { describe, it, expect } from "vitest";
import { boostDriverLabelKey, describeBoostDriver, normalizeIndexBoost } from "./useIndexBoost";

const label = (k: string) => `L(${k})`;
const fmt = (n: number, d?: number) => n.toFixed(d ?? 0);

describe("normalizeIndexBoost (VTID-04489)", () => {
  it("maps the live RPC shape", () => {
    // Copied from the live function's output for a member with 18 journey sessions.
    const b = normalizeIndexBoost({ kind: "active", hidden: false, drivers: [{ type: "journey", count: 18, total: 36, pillar: "mental", activity: null, pillar_delta: 0 }], is_owner: false, index_delta: 0, window_days: 30 })!;
    expect(b).toEqual({ hidden: false, windowDays: 30, kind: "active", drivers: [{ type: "journey", activity: null, count: 18, total: 36 }] });
  });

  it("honours an opt-out", () => {
    expect(normalizeIndexBoost({ hidden: true })!.hidden).toBe(true);
  });

  it("drops unknown types, zero counts and unknown activities", () => {
    const b = normalizeIndexBoost({ window_days: 7, kind: "boost", drivers: [
      { type: "made_up", count: 3 }, { type: "nutrition", count: 0 }, { type: "workout", activity: "base_jumping", count: 2, total: 60 },
    ] })!;
    expect(b.drivers).toEqual([{ type: "workout", activity: "workout", count: 2, total: 60 }]);
    expect(b.windowDays).toBe(7);
  });

  it("returns null for null input", () => {
    expect(normalizeIndexBoost(null)).toBeNull();
  });
});

describe("describeBoostDriver", () => {
  it("builds window-specific sentences", () => {
    expect(describeBoostDriver({ type: "workout", activity: "running", count: 4, total: 120 }, 7, label, fmt))
      .toEqual({ key: "profile.indexBoost.workout7", params: { activity: "L(profile.indexBoost.activity.running)", count: 4 } });
    expect(describeBoostDriver({ type: "sleep", activity: null, count: 5, total: 450 }, 30, label, fmt))
      .toEqual({ key: "profile.indexBoost.sleep30", params: { hours: "7.5" } });
  });

  it("refuses a sentence it has no number for", () => {
    expect(describeBoostDriver({ type: "sleep", activity: null, count: 2, total: null }, 7, label, fmt)).toBeNull();
    expect(describeBoostDriver({ type: "mindfulness", activity: null, count: 2, total: null }, 7, label, fmt)).toBeNull();
  });

  it("labels chips by activity or type", () => {
    expect(boostDriverLabelKey({ type: "workout", activity: "cycling", count: 1, total: null })).toBe("profile.indexBoost.activity.cycling");
    expect(boostDriverLabelKey({ type: "journey", activity: null, count: 1, total: null })).toBe("profile.indexBoost.type.journey");
  });
});
