/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * "Let's improve your health" steps and the 90-day goal of the Vitana Index
 * page, the same rules as the web `src/lib/vitana-index-next-steps.ts`
 * (buildNextSteps, pillarsLevel, hasConnectedData, goalProgress,
 * THRIVING_GOAL, ELITE_GOAL). Not core-extracted: the web module
 * runtime-imports `weakestPillar` from `src/hooks/useVitanaIndex.ts`, which
 * imports the web Supabase client (class B), so `core-closure` would refuse
 * it; the native copy takes `weakestPillar` from health-hub's native Index
 * module instead. Pure.
 */
import { weakestPillar, type VitanaIndexState, type VitanaPillarKey } from '../data/vitana-index';

export type NextStepId = 'blood' | 'devices' | 'focus' | 'journey';

export interface NextStep {
  id: NextStepId;
  done: boolean;
  /** Only for `focus`: the pillar with the most room to grow. */
  pillar?: VitanaPillarKey;
  /** Only for `focus`: all pillars are level, so there is no single biggest lever. */
  even?: boolean;
}

/** True when every pillar has the same score (nothing lags behind). */
export function pillarsLevel(index: VitanaIndexState): boolean {
  const values = Object.values(index.pillars);
  return Math.min(...values) === Math.max(...values);
}

/** True when any pillar already earns points from connected data (a tracker or regular logs). */
export function hasConnectedData(index: VitanaIndexState | null): boolean {
  if (!index?.subscores) return false;
  return Object.values(index.subscores).some((s) => s.data > 0);
}

export function buildNextSteps(index: VitanaIndexState | null, opts: { hasBloodPanel: boolean }): NextStep[] {
  const steps: NextStep[] = [
    { id: 'blood', done: opts.hasBloodPanel },
    { id: 'devices', done: hasConnectedData(index) },
  ];
  if (index) steps.push({ id: 'focus', done: false, pillar: weakestPillar(index.pillars), even: pillarsLevel(index) });
  steps.push({ id: 'journey', done: false });
  // Stable partition: open steps keep their order, finished ones go last.
  return [...steps.filter((s) => !s.done), ...steps.filter((s) => s.done)];
}

/** The two milestones of the 90-day framing. */
export const THRIVING_GOAL = 600;
export const ELITE_GOAL = 800;

/** Which milestone the member is climbing toward, and how far along they are (0..1). */
export function goalProgress(total: number): { target: number; remaining: number; ratio: number } {
  const target = total >= THRIVING_GOAL ? ELITE_GOAL : THRIVING_GOAL;
  const remaining = Math.max(target - total, 0);
  const ratio = Math.min(Math.max(total / target, 0), 1);
  return { target, remaining, ratio };
}

/** VitanaIndexDetail.tsx:101-107 balanceKey. */
export function balanceKey(factor: number | null): string | null {
  if (factor === null) return null;
  if (factor >= 1.0) return 'vitanaIndexPage.balance.even';
  if (factor >= 0.9) return 'vitanaIndexPage.balance.slight';
  if (factor >= 0.8) return 'vitanaIndexPage.balance.uneven';
  return 'vitanaIndexPage.balance.veryUneven';
}

/** VitanaIndexDetail.tsx:94-99 heroLine. */
export function heroLineKey(index: VitanaIndexState | null): string {
  if (!index) return 'vitanaIndexPage.hero.lineNoIndex';
  if (index.trend === 'up') return 'vitanaIndexPage.hero.lineUp';
  if (index.trend === 'down') return 'vitanaIndexPage.hero.lineDown';
  return 'vitanaIndexPage.hero.lineSteady';
}
