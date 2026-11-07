/**
 * VTID-05461 — native twin of the daily-goal branch of `src/lib/celebrate.ts`
 * (`celebrate({ kind: "daily-goal", source: "my-journey" })`, fired by
 * TodaysGoalCard.tsx:34-36; fireDailyGoal, celebrate.ts:408-432):
 *  - once per LOCAL calendar day (`vitana:celebrate:daily_goal:day`, native
 *    key-value store; celebrate.ts:194-209);
 *  - the milestone modal through the `vitana-milestone` event (overlay bus,
 *    the web window event; MilestoneCelebration.tsx listens), title/body from
 *    `toasts.dailyGoal.*`;
 *  - confetti unless reduced motion, at most every 5 min (CONFETTI_THROTTLE_MS);
 *  - the analytics post `POST /api/v1/analytics/celebrate` with
 *    `{ kind, source, throttled }` (celebrate.ts:130-180), fire-and-forget.
 * The web also calls `playSound("/audio/lift.mp3")` (celebrate.ts:427), but
 * no `public/audio/` file ships, so the mobile web plays nothing; no sound here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { overlayBus } from '../../navigation/overlay-bus';
import { communityFetch } from './data/client';
import { localDayKey } from './hooks/useVitanaStreaks';

export const MILESTONE_EVENT = 'vitana-milestone';
export const DAILY_GOAL_DAY_KEY = 'vitana:celebrate:daily_goal:day';
const CONFETTI_THROTTLE_MS = 5 * 60_000;
let lastConfettiAt = 0;

export interface MilestoneDetail {
  milestone: string;
  titleKey: string;
  bodyKey: string;
  url?: string;
  confetti: boolean;
}

function postAnalytics(payload: { kind: string; source?: string; throttled: boolean }): void {
  communityFetch('/analytics/celebrate', { method: 'POST', body: JSON.stringify(payload) }).catch(() => undefined);
}

/** The OS reduced-motion setting at fire time (the web reads `prefers-reduced-motion` the same way, celebrate.ts:105-108). */
async function prefersReducedMotion(): Promise<boolean> {
  try {
    return (await AccessibilityInfo.isReduceMotionEnabled?.()) === true;
  } catch {
    return false;
  }
}

export async function celebrateDailyGoal(opts: { source?: string } = {}): Promise<{ throttled: boolean }> {
  const source = opts.source ?? 'my-journey';
  const today = localDayKey();
  const stored = await AsyncStorage.getItem(DAILY_GOAL_DAY_KEY).catch(() => null);
  if (stored === today) {
    postAnalytics({ kind: 'daily-goal', source, throttled: true });
    return { throttled: true };
  }
  await AsyncStorage.setItem(DAILY_GOAL_DAY_KEY, today).catch(() => undefined);
  const now = Date.now();
  const confetti = !(await prefersReducedMotion()) && now - lastConfettiAt > CONFETTI_THROTTLE_MS;
  if (confetti) lastConfettiAt = now;
  const detail: MilestoneDetail = { milestone: 'daily_goal', titleKey: 'toasts.dailyGoal.title', bodyKey: 'toasts.dailyGoal.body', confetti };
  overlayBus.emit(MILESTONE_EVENT, detail);
  postAnalytics({ kind: 'daily-goal', source, throttled: false });
  return { throttled: false };
}

/** Test-only: forget the confetti throttle. */
export function __resetCelebrateForTests(): void {
  lastConfettiAt = 0;
}
