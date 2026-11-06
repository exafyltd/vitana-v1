/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the My Journey
 * gateway reads and writes, re-implemented natively (each web module imports
 * the community gateway, so it is class-B and not core-extracted). Same
 * endpoints, query keys, bodies and cache invalidations as:
 *
 *  - `src/hooks/useMyJourney.ts`            GET  /my-journey                     ["my-journey", user]
 *  - `src/pages/AutopilotDashboard.tsx:212` GET  /autopilot/recommendations?status=new,activated,completed&limit=100
 *                                                                               ["autopilot-onboarding", user]
 *  - `src/hooks/useGoalPlan.ts`             GET  /goal-plan?locale=             ["goal-plan", language]
 *                                           POST /goal-plan/generate?locale=    { answers }
 *                                           POST /goal-plan/steps/:id/complete  { done }
 *  - `src/hooks/useJourneyChecklist.ts`     GET  /journey-checklist?locale=     ["journey-checklist", locale]
 *  - `src/lib/journeyPractice.ts`           POST /journey/practice-complete     { topicId }
 *                                           POST /journey/session-listened      { session, topicId, localDate }
 *
 * The goal-plan generation is an LLM call on the member's behalf: like the
 * web it carries the member's language (`?locale=`), so the backend writes the
 * plan in that language (R2.5); the native port adds no prompt of its own.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { communityFetch } from './client';
import type { ClarificationAnswer, GoalPlanView, MyJourneyResponse, HorizonBucket } from '../../../ports/journey';

// ── /my-journey ──────────────────────────────────────────────────────────
export function useMyJourney() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-journey', user?.id],
    queryFn: async () => {
      const res = await communityFetch('/my-journey');
      if (!res.ok) throw new Error('Failed to fetch my-journey');
      return res.json<MyJourneyResponse>();
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
}

// ── onboarding recommendations (Today's goal + search) ──────────────────
export interface Recommendation {
  id: string;
  title: string;
  summary: string;
  status: string;
  source_ref: string;
  impact_score: number;
  wave_id?: string | number;
  wave_order?: number;
  horizon?: HorizonBucket;
}

export function useOnboardingRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['autopilot-onboarding', user?.id],
    queryFn: async () => {
      const res = await communityFetch('/autopilot/recommendations?status=new,activated,completed&limit=100');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json<{ recommendations: Recommendation[] }>();
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
}

// ── goal plan ────────────────────────────────────────────────────────────
export interface GoalPlanResponse {
  ok: boolean;
  plan: GoalPlanView | null;
  error?: string;
  needs_clarification?: boolean;
  questions?: string[];
}

export function useGoalPlan() {
  const { user } = useAuth();
  const { language } = useI18n();
  return useQuery({
    queryKey: ['goal-plan', language],
    queryFn: async () => {
      const res = await communityFetch(`/goal-plan?locale=${encodeURIComponent(language)}`);
      if (!res.ok) throw new Error('Failed to fetch goal plan');
      return res.json<GoalPlanResponse>();
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user,
  });
}

/** Vitana (re)builds the plan for the active goal — in the member's language. */
export function useGenerateGoalPlan() {
  const queryClient = useQueryClient();
  const { language } = useI18n();
  return useMutation({
    mutationFn: async (vars?: { answers?: ClarificationAnswer[] }) => {
      const res = await communityFetch(`/goal-plan/generate?locale=${encodeURIComponent(language)}`, {
        method: 'POST',
        body: JSON.stringify({ answers: vars?.answers ?? [] }),
      });
      if (!res.ok) throw new Error('Failed to generate plan');
      return res.json<GoalPlanResponse & { plan_id?: string }>();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goal-plan'] });
    },
  });
}

export function useCompleteGoalStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, done = true }: { stepId: string; done?: boolean }) => {
      const res = await communityFetch(`/goal-plan/steps/${stepId}/complete`, { method: 'POST', body: JSON.stringify({ done }) });
      if (!res.ok) throw new Error('Failed to update step');
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goal-plan'] });
    },
  });
}

// ── guided-journey curriculum ────────────────────────────────────────────
export interface PublicTopic {
  topicId: string;
  session: number;
  position: number;
  chapterId: string;
  displayLabel: string;
  shortDescription: string | null;
  explanation: {
    whatItIs: string | null;
    userBenefit: string | null;
    whenToUse: string | null;
    tryThis: string | null;
  };
  guidedPracticeTarget: string | null;
  businessGate: string | null;
}

export interface JourneySession {
  session: number;
  chapterId: string;
  topics: PublicTopic[];
}

export function journeyChecklistQueryKey(locale: string) {
  return ['journey-checklist', locale] as const;
}

export async function fetchJourneyChecklist(locale: string): Promise<PublicTopic[]> {
  const resp = await communityFetch(`/journey-checklist?locale=${encodeURIComponent(locale)}`);
  const json = await resp.json<{ ok?: boolean; topics?: unknown; error?: string }>().catch(() => ({}) as { ok?: boolean; topics?: unknown; error?: string });
  if (!resp.ok || !json?.ok) throw new Error(json?.error || 'load_failed');
  return Array.isArray(json.topics) ? (json.topics as PublicTopic[]) : [];
}

/** web useJourneyChecklist: the curriculum in the live UI language, grouped by session. */
export function useJourneyChecklist() {
  const { language } = useI18n();
  const locale = (language || 'de').split('-')[0];
  const { data: topics = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: journeyChecklistQueryKey(locale),
    queryFn: () => fetchJourneyChecklist(locale),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const error = queryError ? (queryError as Error).message : null;
  const bySession = new Map<number, PublicTopic[]>();
  for (const t of topics) {
    const arr = bySession.get(t.session) ?? [];
    arr.push(t);
    bySession.set(t.session, arr);
  }
  const sessions: JourneySession[] = Array.from(bySession.keys())
    .sort((a, b) => a - b)
    .map((s) => {
      const ts = (bySession.get(s) as PublicTopic[]).slice().sort((a, b) => a.position - b.position);
      return { session: s, chapterId: ts[0]?.chapterId ?? '', topics: ts };
    });
  const chapters = Array.from(new Set(sessions.map((s) => s.chapterId).filter(Boolean)));
  return { topics, sessions, chapters, loading, error };
}

// ── practice + listen ────────────────────────────────────────────────────
export async function completePractice(topicId: string): Promise<boolean> {
  try {
    const resp = await communityFetch('/journey/practice-complete', { method: 'POST', body: JSON.stringify({ topicId }) });
    const json = await resp.json<{ ok?: boolean }>();
    return !!(resp.ok && json?.ok);
  } catch {
    return false;
  }
}

/** The member's own calendar day (YYYY-MM-DD). */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The +2 VITANA INDEX listen reward; fire-and-forget. True only for a NEW award. */
export async function recordSessionListened(session: number, topicId?: string): Promise<boolean> {
  try {
    const resp = await communityFetch('/journey/session-listened', {
      method: 'POST',
      body: JSON.stringify({ session, topicId, localDate: localDateKey() }),
    });
    const json = await resp.json<{ ok?: boolean; awarded?: boolean }>();
    return !!(resp.ok && json?.ok && json?.awarded);
  } catch {
    return false;
  }
}

export type PracticeAction = { kind: 'route'; route: string } | { kind: 'overlay'; event: string } | { kind: 'orb' };

const OVERLAY_EVENTS: Record<string, string> = { life_compass: 'vitana:open-life-compass' };
const ORB_TARGETS = new Set(['orb_overview']);
const TARGET_ROUTES: Record<string, string> = {
  vitana_index: '/health/vitana-index',
  my_journey: '/autopilot',
  community_overview: '/comm',
  memory: '/memory',
  reminders: '/reminders',
  calendar: '/reminders',
  universal_cart: '/cart',
  cart: '/cart',
  media_hub: '/comm/media-hub',
  events: '/comm/events-meetups',
  create_event: '/comm/events-meetups',
  find_a_match: '/home/matches',
  matches: '/home/matches',
  live_room: '/comm/live-rooms',
  business_hub: '/business',
};

/** web practiceTargetAction (journeyPractice.ts:95-104). */
export function practiceTargetAction(target: string | null | undefined): PracticeAction | null {
  if (!target) return null;
  const overlay = OVERLAY_EVENTS[target];
  if (overlay) return { kind: 'overlay', event: overlay };
  if (ORB_TARGETS.has(target)) return { kind: 'orb' };
  const route = TARGET_ROUTES[target];
  return route ? { kind: 'route', route } : null;
}
