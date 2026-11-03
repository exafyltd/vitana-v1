/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — what `/ai/companion` does
 * on open (web `useAutopilotComplete().completeBySourceRef('onboarding_maxina')`,
 * Companion.tsx:37): complete the member's open onboarding recommendation
 * and toast the result the way the web `celebrate({ kind: 'index-lift' })` /
 * `toast.success` does — the moved pillars (largest first), the VTNA reward
 * and the predicted Index, or "+N VTNA earned" with the task title. The
 * pillar names, VTNA and "Index now" come from the catalogs (the web prints
 * English literals there). The web's big-lift confetti + sound belong to the
 * shell-wide celebration layer, which the native app does not have yet.
 */
import { useEffect } from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { notifySuccess } from '../../../ports/ai-coach';
import type { Params } from '../../../i18n';
import { completeAutopilotBySourceRef, type AutopilotCompletion, type ContributionVector } from './gateway';
import { useVitanaIndex } from './hooks';

const EMOJI: Record<string, string> = { nutrition: '🥗', hydration: '💧', exercise: '💪', sleep: '😴', mental: '🧠' };

type T = (key: string, params?: Params) => string;

function moved(vector: ContributionVector | undefined): Array<[string, number]> {
  if (!vector) return [];
  return (Object.entries(vector) as Array<[string, number | undefined]>)
    .filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0 && e[0] in EMOJI)
    .sort((a, b) => b[1] - a[1]);
}

/** The toast (title key, description key, params) for one completion; null when there is nothing to celebrate. */
export function completionToast(done: AutopilotCompletion, previousTotal: number | null, t: T): { titleKey: string; descKey?: string; params: Params } | null {
  const m = moved(done.vector);
  const magnitude = m.reduce((s, [, v]) => s + v, 0);
  if (done.vector && magnitude > 0) {
    const label = (k: string) => t(`vitanaIndex.${k}`);
    const newTotal = previousTotal !== null ? previousTotal + magnitude : undefined;
    const lead = m.length === 1 ? `${EMOJI[m[0][0]]} ${label(m[0][0])} +${m[0][1]}` : m.slice(0, 2).map(([k, v]) => `${label(k)} +${v}`).join(', ');
    const vtna = done.reward && done.reward > 0 ? t('aiCoachNative.lift.vtna', { n: done.reward }) : '';
    const total = typeof newTotal === 'number' ? t('aiCoachNative.lift.total', { n: newTotal }) : '';
    const detail = m.length > 1 ? m.map(([k, v]) => `${label(k)} +${v}`).join(' · ') : '';
    return { titleKey: 'aiCoachNative.lift.title', descKey: detail ? 'aiCoachNative.lift.detail' : undefined, params: { lead, vtna, total, detail } };
  }
  if (typeof done.reward === 'number' && done.reward > 0) {
    return { titleKey: 'aiCoachNative.autopilotDone.reward', descKey: 'aiCoachNative.autopilotDone.task', params: { reward: done.reward, title: done.title } };
  }
  return null;
}

/** Runs the completion once the member and the Index are known; toasts through the kit. */
export function useCompleteOnOpen(sourceRef: string, t: T): void {
  const { user } = useAuth();
  const { index, isLoading } = useVitanaIndex();
  useEffect(() => {
    if (!user || isLoading) return;
    let active = true;
    void completeAutopilotBySourceRef(sourceRef).then((done) => {
      if (!active || !done) return;
      const toast = completionToast(done, index?.total ?? null, t);
      if (toast) notifySuccess(toast.titleKey, toast.descKey, toast.params);
    });
    return () => {
      active = false;
    };
    // The ref fires once per session (gateway.ts firedRefs); `index` is read at that moment, as on the web.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, sourceRef]);
}
