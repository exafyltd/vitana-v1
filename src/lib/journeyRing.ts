import type { MyJourneyGoal, MyJourneyJourney } from "@/hooks/useMyJourney";

/**
 * Which timeline the My Journey ring is counting down.
 * - `goal`       → the user set a target date; count down to it.
 * - `onboarding` → no goal deadline yet; count down the 90-day onboarding plan.
 * - `null`       → nothing to count down (journey data unavailable).
 */
export type RingCountdownSource = "goal" | "onboarding" | null;

export interface JourneyRingModel {
  /** 1-based day number rendered in the ring center (Day 1, never Day 0). */
  day: number;
  /** Days remaining in the active countdown. */
  daysLeft: number;
  /** Total days of the active countdown window (null when there's nothing to count). */
  total: number | null;
  /** Ring fill percentage, 0–100. */
  pct: number;
  /** Whether the countdown reflects the goal deadline or the 90-day onboarding plan. */
  source: RingCountdownSource;
  /** True when there is a real countdown to render. */
  hasCountdown: boolean;
}

/**
 * The My Journey ring is ALWAYS a countdown. When the user's goal has a
 * deadline we count down to it. When it doesn't — or there's no goal yet — we
 * fall back to the 90-day onboarding journey so the ring keeps counting DOWN
 * the plan, rather than counting UP indefinitely from the goal's set date.
 *
 * Both inputs come from the same `/api/v1/my-journey` payload: `goal`
 * (life_compass) and `journey` (the onboarding plan with day_in_journey /
 * total_days / days_left).
 */
export function buildJourneyRing(
  goal: MyJourneyGoal | null,
  journey: MyJourneyJourney | null,
): JourneyRingModel {
  // Goal deadline set → count down to the goal's target date.
  if (goal?.has_deadline) {
    const total = goal.goal_total_days ?? null;
    const rawDay = (goal.goal_day ?? 0) + 1;
    return {
      day: Math.min(rawDay, total ?? rawDay),
      daysLeft: goal.days_to_deadline ?? 0,
      total,
      pct: goal.goal_progress_pct ?? 0,
      source: "goal",
      hasCountdown: true,
    };
  }

  // No goal deadline → count down the 90-day onboarding plan.
  if (journey && journey.total_days > 0) {
    const total = journey.total_days;
    const dayInJourney = Math.max(0, journey.day_in_journey ?? 0);
    const rawDay = dayInJourney + 1;
    const daysLeft =
      typeof journey.days_left === "number"
        ? journey.days_left
        : Math.max(0, total - dayInJourney);
    return {
      day: Math.min(rawDay, total),
      daysLeft,
      total,
      pct: Math.min(100, Math.round((dayInJourney / total) * 100)),
      source: "onboarding",
      hasCountdown: true,
    };
  }

  // Journey unavailable — keep a sane Day-1 default with no countdown.
  const rawDay = (goal?.goal_day ?? 0) + 1;
  return { day: rawDay, daysLeft: 0, total: null, pct: 0, source: null, hasCountdown: false };
}
