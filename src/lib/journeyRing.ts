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
 *
 * The big center number (`day`) is ALWAYS `journey.day_in_journey` — calendar
 * days since the user's Vitana journey began (`user_journey.started_at`).
 * This is the exact same value the ORB voice greeting speaks ("Heute ist
 * dein {day_in_journey}. Tag mit Vitana"), so the ring and the greeting can
 * never disagree. It used to be swapped for `goal.goal_day` (days since the
 * active Life Compass goal was *set*) whenever a deadline goal existed —
 * a different, independently-drifting counter that made the screen and the
 * voice greeting show two different "day" numbers for the same account.
 * The goal deadline still drives the countdown around that number
 * (`daysLeft` / `total` / `pct`) — that's a genuinely different quantity
 * (time left, not day count) and is fine to differ.
 */
export function buildJourneyRing(
  goal: MyJourneyGoal | null,
  journey: MyJourneyJourney | null,
): JourneyRingModel {
  const dayInJourney = Math.max(0, journey?.day_in_journey ?? goal?.goal_day ?? 0);
  const day = dayInJourney + 1;

  // Goal deadline set → the countdown (fill %, days-left, total) tracks the
  // goal's target date. `day` still reads the user's real journey tenure.
  if (goal?.has_deadline) {
    return {
      day,
      daysLeft: goal.days_to_deadline ?? 0,
      total: goal.goal_total_days ?? null,
      pct: goal.goal_progress_pct ?? 0,
      source: "goal",
      hasCountdown: true,
    };
  }

  // No goal deadline → count down the 90-day onboarding plan.
  if (journey && journey.total_days > 0) {
    const total = journey.total_days;
    const daysLeft =
      typeof journey.days_left === "number"
        ? journey.days_left
        : Math.max(0, total - dayInJourney);
    return {
      day,
      daysLeft,
      total,
      pct: Math.min(100, Math.round((dayInJourney / total) * 100)),
      source: "onboarding",
      hasCountdown: true,
    };
  }

  // Journey unavailable — keep a sane Day-1 default with no countdown.
  return { day, daysLeft: 0, total: null, pct: 0, source: null, hasCountdown: false };
}
