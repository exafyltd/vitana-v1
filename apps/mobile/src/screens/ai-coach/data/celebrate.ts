/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — what `/ai/companion` does
 * on open (web `useAutopilotComplete().completeBySourceRef('onboarding_maxina')`,
 * Companion.tsx:37): complete the member's open onboarding recommendation
 * and toast the result the way the web `celebrate({ kind: 'index-lift' })` /
 * `toast.success` does — the moved pillars (largest first), the VTNA reward
 * and the predicted Index, or "+N VTNA earned" with the task title. The
 * pillar names, VTNA and "Index now" come from the catalogs (the web prints
 * English literals there). A big lift (web celebrate.ts:287-296) adds the
 * confetti burst (cards/Confetti.tsx) and the extra `toasts.common.success`
 * toast of `celebrateSuccess` (confetti.ts:114-127): magnitude >= 10, reduce
 * motion off, and 5 minutes since the last burst (timestamp in device
 * storage, like the AI consent flag in ./hooks). The web's
 * `playSound('/audio/lift.mp3')` (celebrate.ts:295) is not ported: the asset
 * is not in the repo (no `public/audio/`), so there is nothing to bundle.
 */
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { notifySuccess } from '../../../ports/ai-coach';
import type { Params } from '../../../i18n';
import { completeAutopilotBySourceRef, type AutopilotCompletion, type ContributionVector } from './gateway';
import { useVitanaIndex } from './hooks';

const EMOJI: Record<string, string> = { nutrition: '🥗', hydration: '💧', exercise: '💪', sleep: '😴', mental: '🧠' };

type T = (key: string, params?: Params) => string;

/** celebrate.ts:97-99 (BIG_LIFT_THRESHOLD, CONFETTI_THROTTLE_MS). */
export const BIG_LIFT_THRESHOLD = 10;
export const CONFETTI_THROTTLE_MS = 5 * 60_000;
export const BIG_LIFT_STORAGE_KEY = 'vitana:celebrate:lastConfettiAt';

/**
 * celebrate.ts:287-288: true (and the timestamp stored) when this lift earns
 * the confetti; false below the threshold, with reduce motion on, or inside
 * the throttle window.
 */
export async function claimBigLift(magnitude: number, now = Date.now()): Promise<boolean> {
  if (magnitude < BIG_LIFT_THRESHOLD) return false;
  const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
  if (reduced) return false;
  const last = Number(await deviceStorage.getItem(BIG_LIFT_STORAGE_KEY)) || 0;
  if (now - last <= CONFETTI_THROTTLE_MS) return false;
  await deviceStorage.setItem(BIG_LIFT_STORAGE_KEY, String(now));
  return true;
}

function moved(vector: ContributionVector | undefined): Array<[string, number]> {
  if (!vector) return [];
  return (Object.entries(vector) as Array<[string, number | undefined]>)
    .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0 && e[0] in EMOJI)
    .sort((a, b) => b[1] - a[1]);
}

/** The toast (title key, description key, params) for one completion; null when there is nothing to celebrate. */
export function completionToast(done: AutopilotCompletion, previousTotal: number | null, t: T): { titleKey: string; descKey?: string; params: Params; magnitude: number } | null {
  const m = moved(done.vector);
  const magnitude = m.reduce((s, [, v]) => s + v, 0);
  if (done.vector && magnitude > 0) {
    const label = (k: string) => t(`vitanaIndex.${k}`);
    const newTotal = previousTotal !== null ? previousTotal + magnitude : undefined;
    const lead = m.length === 1 ? `${EMOJI[m[0][0]]} ${label(m[0][0])} +${m[0][1]}` : m.slice(0, 2).map(([k, v]) => `${label(k)} +${v}`).join(', ');
    const vtna = done.reward && done.reward > 0 ? t('aiCoachNative.lift.vtna', { n: done.reward }) : '';
    const total = typeof newTotal === 'number' ? t('aiCoachNative.lift.total', { n: newTotal }) : '';
    const detail = m.length > 1 ? m.map(([k, v]) => `${label(k)} +${v}`).join(' · ') : '';
    return { titleKey: 'aiCoachNative.lift.title', descKey: detail ? 'aiCoachNative.lift.detail' : undefined, params: { lead, vtna, total, detail }, magnitude };
  }
  if (typeof done.reward === 'number' && done.reward > 0) {
    return { titleKey: 'aiCoachNative.autopilotDone.reward', descKey: 'aiCoachNative.autopilotDone.task', params: { reward: done.reward, title: done.title }, magnitude: 0 };
  }
  return null;
}

/**
 * Runs the completion once the member and the Index are known; toasts through
 * the kit. `burst` > 0 while a big-lift confetti burst should show (a new
 * value per burst); `burstDone` hides it.
 */
export function useCompleteOnOpen(sourceRef: string, t: T): { burst: number; burstDone: () => void } {
  const { user } = useAuth();
  const { index, isLoading } = useVitanaIndex();
  const [burst, setBurst] = useState(0);
  const burstDone = useCallback(() => setBurst(0), []);
  useEffect(() => {
    if (!user || isLoading) return;
    let active = true;
    void completeAutopilotBySourceRef(sourceRef).then(async (done) => {
      if (!active || !done) return;
      const toast = completionToast(done, index?.total ?? null, t);
      if (!toast) return;
      notifySuccess(toast.titleKey, toast.descKey, toast.params);
      if (!(await claimBigLift(toast.magnitude))) return;
      if (active) setBurst(Date.now());
      notifySuccess('toasts.common.success');
    });
    return () => {
      active = false;
    };
    // The ref fires once per session (gateway.ts firedRefs); `index` is read at that moment, as on the web.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, sourceRef]);
  return { burst, burstDone };
}
