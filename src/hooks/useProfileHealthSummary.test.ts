import { describe, it, expect } from "vitest";
import { normalizeHealthSummary } from "./useProfileHealthSummary";

// Shapes copied from the live RPC output (VTID-04483 verification, 2026-09-24).
const owner = {
  score: 125, shared: true, is_owner: true, has_index: true, week_delta: null, is_baseline: false,
  pillars: {
    sleep: { score: 25, delta_7d: null }, mental: { score: 25, delta_7d: null },
    exercise: { score: 25, delta_7d: null }, hydration: { score: 25, delta_7d: null },
    nutrition: { score: 25, delta_7d: null },
  },
  activity: { steps_avg_7d: null, days_logged_7d: 0, sleep_nights_7d: 0, water_avg_ml_7d: null,
    workout_minutes_7d: null, logging_streak_days: 0, sleep_avg_minutes_7d: null, meditation_minutes_7d: null },
  standing: { available: true, cohort_size: 67, top_percent: 15, community_average: 72 },
  thresholds: { min_cohort: 20, min_history_days: 7 },
  achievements: [],
};
const visitor = {
  score: 200, shared: false, is_owner: false, has_index: true, pillars: null, activity: null,
  standing: { available: true, cohort_size: 66, top_percent: 2, community_average: 70 },
  thresholds: { min_cohort: 20 }, achievements: [],
};

describe("normalizeHealthSummary (VTID-04483)", () => {
  it("maps the owner payload", () => {
    const s = normalizeHealthSummary(owner)!;
    expect(s.isOwner).toBe(true);
    expect(s.standing).toEqual({ available: true, topPercent: 15, communityAverage: 72, cohortSize: 67 });
    expect(s.pillars?.exercise).toEqual({ score: 25, delta7d: null });
    expect(s.activity?.daysLogged7d).toBe(0);
  });

  it("keeps a non-sharing visitor to score + standing", () => {
    const s = normalizeHealthSummary(visitor)!;
    expect(s.shared).toBe(false);
    expect(s.pillars).toBeNull();
    expect(s.activity).toBeNull();
    expect(s.standing?.topPercent).toBe(2);
  });

  it("never exposes a figure when standing is unavailable", () => {
    const s = normalizeHealthSummary({ ...owner, standing: { available: false, reason: "cohort_too_small", cohort_size: 12, top_percent: 5 } })!;
    expect(s.standing).toEqual({ available: false, topPercent: null, communityAverage: null, cohortSize: 12 });
  });

  it("drops malformed achievements and incomplete pillars", () => {
    const s = normalizeHealthSummary({
      ...owner,
      achievements: [{ type: "personal_best", score: 300 }, { type: "personal_best" }, { type: "made_up", score: 1 }],
      pillars: { ...owner.pillars, sleep: { score: "25" } },
    })!;
    expect(s.achievements).toEqual([{ type: "personal_best", score: 300 }]);
    expect(s.pillars).toBeNull();
  });

  it("returns null for null / non-object input (anonymous caller)", () => {
    expect(normalizeHealthSummary(null)).toBeNull();
    expect(normalizeHealthSummary("x")).toBeNull();
  });
});
