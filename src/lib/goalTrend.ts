import type { GoalPlanView } from "@/hooks/useGoalPlan";

export type GoalTrend = "up" | "flat" | "down";

/**
 * Schedule-adherence trend for the goal plan: of the dated steps
 * (milestones + checkpoints) due by today, how many are done.
 *   up   — nothing overdue (keeping pace)
 *   flat — behind, but at least keeping even with the backlog (stagnating)
 *   down — most due steps left undone (falling behind)
 * Returns null when the plan has no dated steps to judge against.
 */
export function computeGoalTrend(plan: GoalPlanView | null, todayIso: string): GoalTrend | null {
  if (!plan) return null;
  const dated = [...plan.milestones, ...plan.checkpoints].filter((s) => !!s.scheduled_date);
  if (dated.length === 0) return null;
  const due = dated.filter((s) => (s.scheduled_date as string) <= todayIso);
  if (due.length === 0) return "up"; // nothing due yet → on track
  const done = due.filter((s) => s.status === "done").length;
  const overdue = due.length - done;
  if (overdue === 0) return "up";
  return done >= overdue ? "flat" : "down";
}
