/**
 * VTID-04773 — the "Let's improve your health" steps on the Vitana Index page.
 *
 * Pure so the order is testable: the member always sees the most useful open
 * step first ("Next up"), the rest below it, and finished one-time steps
 * (blood test uploaded, tracker connected) drop to the end with a check mark.
 */
import type { VitanaIndexState, VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { weakestPillar } from "@/hooks/useVitanaIndex";

export type NextStepId = "blood" | "devices" | "focus" | "journey";

export interface NextStep {
  id: NextStepId;
  done: boolean;
  /** Only for `focus`: the pillar with the most room to grow. */
  pillar?: VitanaPillarKey;
}

/** True when any pillar already earns points from connected data (a tracker or regular logs). */
export function hasConnectedData(index: VitanaIndexState | null): boolean {
  if (!index?.subscores) return false;
  return Object.values(index.subscores).some((s) => s.data > 0);
}

export function buildNextSteps(
  index: VitanaIndexState | null,
  opts: { hasBloodPanel: boolean },
): NextStep[] {
  const steps: NextStep[] = [
    { id: "blood", done: opts.hasBloodPanel },
    { id: "devices", done: hasConnectedData(index) },
  ];
  if (index) steps.push({ id: "focus", done: false, pillar: weakestPillar(index.pillars) });
  steps.push({ id: "journey", done: false });

  // Stable partition: open steps keep their order, finished ones go last.
  return [...steps.filter((s) => !s.done), ...steps.filter((s) => s.done)];
}

/** The two milestones of the 90-day framing (see lib/vitanaIndex tiers). */
export const THRIVING_GOAL = 600;
export const ELITE_GOAL = 800;

/** Which milestone the member is climbing toward, and how far along they are (0..1). */
export function goalProgress(total: number): { target: number; remaining: number; ratio: number } {
  const target = total >= THRIVING_GOAL ? ELITE_GOAL : THRIVING_GOAL;
  const remaining = Math.max(target - total, 0);
  const ratio = Math.min(Math.max(total / target, 0), 1);
  return { target, remaining, ratio };
}
