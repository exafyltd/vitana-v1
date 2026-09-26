/**
 * VTID-04483 — the real Health tab only shows what the server returned:
 * activity + share control for the owner, no categories for a non-sharing
 * visitor, and no comparison below the cohort threshold.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProfileHealthTabReal } from "./ProfileHealthTabReal";
import type { ProfileHealthSummary } from "@/hooks/useProfileHealthSummary";

let summary: ProfileHealthSummary | null = null;
vi.mock("@/hooks/useProfileHealthSummary", () => ({
  useProfileHealthSummary: () => ({ data: summary, isLoading: false, isError: false }),
}));
vi.mock("@/context/ProfileProvider", () => ({
  useProfile: () => ({ profile: { account: { visibility: { vitanaHealth: "private" } } }, setFieldVisibility: vi.fn() }),
}));
vi.mock("@/lib/i18n-toast", () => ({
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : k),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/locale-format", () => ({ fmtNumber: (n: number) => String(n) }));
vi.mock("@/hooks/useVitanaIndex", () => ({ pillarLabel: (k: string) => `pillar:${k}` }));

const base: ProfileHealthSummary = {
  hasIndex: true, isOwner: true, shared: true, score: 125, weekDelta: null, isBaseline: false,
  standing: { available: true, topPercent: 15, communityAverage: 72, cohortSize: 67 },
  pillars: {
    nutrition: { score: 30, delta7d: 4 }, hydration: { score: 20, delta7d: null },
    exercise: { score: 40, delta7d: -2 }, sleep: { score: 25, delta7d: 0 }, mental: { score: 15, delta7d: null },
  },
  achievements: [{ type: "logging_streak", days: 5 }],
  activity: { daysLogged7d: 4, sleepAvgMinutes7d: 450, sleepNights7d: 3, waterAvgMl7d: null, workoutMinutes7d: 60,
    stepsAvg7d: null, meditationMinutes7d: null, loggingStreakDays: 5 },
  minCohort: 20,
};
const renderTab = () => render(<ProfileHealthTabReal profile={{} as any} userId="u1" />);

describe("ProfileHealthTabReal (VTID-04483)", () => {
  beforeEach(() => { summary = { ...base }; });

  it("owner: score, standing, pillars, activity rows that have data, share control", () => {
    renderTab();
    expect(screen.getByTestId("health-real-score").textContent).toBe("125");
    expect(screen.getByTestId("health-real-standing")).toBeTruthy();
    expect(screen.getByTestId("health-real-pillars")).toBeTruthy();
    const activity = screen.getByTestId("health-real-activity").textContent ?? "";
    expect(activity).toContain("profile.healthReal.sleepAvg");
    expect(activity).toContain("profile.healthReal.workoutMinutes");
    expect(activity).not.toContain("profile.healthReal.waterAvg");
    expect(screen.getByTestId("health-real-share")).toBeTruthy();
  });

  it("non-sharing visitor: no pillars, no activity, no share control", () => {
    summary = { ...base, isOwner: false, shared: false, pillars: null, activity: null, achievements: [] };
    renderTab();
    expect(screen.queryByTestId("health-real-pillars")).toBeNull();
    expect(screen.queryByTestId("health-real-activity")).toBeNull();
    expect(screen.queryByTestId("health-real-share")).toBeNull();
  });

  it("below the cohort threshold: no comparison figure; only the owner sees why", () => {
    summary = { ...base, standing: { available: false, topPercent: null, communityAverage: null, cohortSize: 12 } };
    renderTab();
    expect(screen.queryByTestId("health-real-standing")).toBeNull();
    expect(screen.getByTestId("health-real-standing-pending")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/topPercent/);

    summary = { ...summary, isOwner: false, shared: false, pillars: null, activity: null };
    renderTab();
    expect(screen.getAllByTestId("health-real-score")).toHaveLength(2);
    expect(screen.getAllByTestId("health-real-standing-pending")).toHaveLength(1);
  });

  it("no index yet: says so instead of showing zeros", () => {
    summary = { ...base, hasIndex: false };
    renderTab();
    expect(screen.getByText("profile.healthReal.noIndex")).toBeTruthy();
    expect(screen.queryByTestId("health-real-score")).toBeNull();
  });
});
