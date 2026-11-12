/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — native twin of the parts of
 * the web `useGuidedJourneyProgress` (`src/hooks/useGuidedJourneyProgress.ts`)
 * and `useJourneyChecklist` (`src/hooks/useJourneyChecklist.ts`) the F1
 * "Longevity Journey" strip card reads. Both web hooks reach the gateway
 * through `communityFetch` (class B), so the two reads are re-implemented on
 * the native gateway fetch, same query keys:
 *
 *   GET /api/v1/journey-checklist?locale=<lang>  the published curriculum
 *   GET /api/v1/journey/state                    the member's durable progress
 *
 * The session math (`summarizeJourney`) mirrors the web: a session is
 * listened when the state lists it, a listened topic of it, or every topic of
 * it is complete; `completedInOrder` counts leading listened sessions;
 * `nextSession` is the first one not listened. The web's localStorage overlay
 * (sessions tapped on that browser before the server answered) has no native
 * writer, so the server state is the whole truth here.
 */
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';
import { useAuth } from '../../../auth/AuthProvider';
import { useI18n } from '../../../i18n/I18nProvider';

/** Web `DAILY_SESSION_GOAL` (VTID-04763: one episode a day). */
export const DAILY_SESSION_GOAL = 1;

export type JourneyTopic = { topicId: string; session: number; position: number };

export type JourneyState = {
  completedTopicIds: string[];
  completedListenedTopicIds: string[];
  completedSessionNumbers: number[];
  dailyListen: { date: string; sessions: number[] } | null;
};

export type JourneySummary = {
  totalSessions: number;
  completedInOrder: number;
  nextSession: { session: number } | null;
  completedToday: number;
  dailyGoal: number;
};

const numbers = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : []);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Local YYYY-MM-DD (the web's internal day bucket). */
export function localDayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchJourneyChecklist(locale: string): Promise<JourneyTopic[]> {
  const json = await gatewayJson<{ ok?: boolean; error?: string; topics?: unknown }>(
    getGateway(),
    `/journey-checklist?locale=${encodeURIComponent(locale)}`,
    { headers: { 'X-Vitana-Active-Role': 'community' } },
  );
  if (!json?.ok) throw new Error(json?.error || 'load_failed');
  return Array.isArray(json.topics) ? (json.topics as JourneyTopic[]) : [];
}

/** Web `fetchJourneyState`: `currentSession` N means sessions 1..N-1 are done. */
export async function fetchJourneyState(): Promise<JourneyState> {
  const empty: JourneyState = { completedTopicIds: [], completedListenedTopicIds: [], completedSessionNumbers: [], dailyListen: null };
  const json = await gatewayJson<{ ok?: boolean; state?: Record<string, unknown> }>(getGateway(), '/journey/state', {
    headers: { 'X-Vitana-Active-Role': 'community' },
  }).catch(() => null);
  const s = json?.ok ? json.state : null;
  if (!s) return empty;
  const current = typeof s.currentSession === 'number' ? s.currentSession : 0;
  const daily = s.dailyListen as { date?: unknown; sessions?: unknown } | null | undefined;
  return {
    completedTopicIds: strings(s.completedTopicIds),
    completedListenedTopicIds: [...strings(s.completedListenedTopicIds), ...strings(s.listenedTopicIds), ...strings(s.sessionListenedTopicIds)],
    completedSessionNumbers: [
      ...(current > 1 ? Array.from({ length: current - 1 }, (_, i) => i + 1) : []),
      ...numbers(s.completedSessionNumbers),
      ...numbers(s.completedSessions),
      ...numbers(s.listenedSessions),
      ...numbers(s.listenedSessionNumbers),
    ],
    dailyListen: daily && typeof daily.date === 'string' ? { date: daily.date, sessions: numbers(daily.sessions) } : null,
  };
}

export function summarizeJourney(topics: JourneyTopic[], state: JourneyState | undefined, today: string = localDayKey()): JourneySummary {
  const bySession = new Map<number, JourneyTopic[]>();
  for (const tp of topics) bySession.set(tp.session, [...(bySession.get(tp.session) ?? []), tp]);
  const sessions = [...bySession.keys()].sort((a, b) => a - b).map((n) => ({ session: n, topics: bySession.get(n) ?? [] }));
  const completed = new Set(state?.completedTopicIds ?? []);
  const listenedTopics = new Set(state?.completedListenedTopicIds ?? []);
  const explicit = new Set(state?.completedSessionNumbers ?? []);
  const listened = new Set<number>();
  for (const s of sessions) {
    const all = s.topics.length > 0 && s.topics.every((tp) => completed.has(tp.topicId));
    if (explicit.has(s.session) || s.topics.some((tp) => listenedTopics.has(tp.topicId)) || all) listened.add(s.session);
  }
  let completedInOrder = 0;
  for (const s of sessions) {
    if (!listened.has(s.session)) break;
    completedInOrder += 1;
  }
  const next = sessions.find((s) => !listened.has(s.session) && s.topics.length > 0);
  const todays = state?.dailyListen && state.dailyListen.date === today ? new Set(state.dailyListen.sessions).size : 0;
  return {
    totalSessions: sessions.length,
    completedInOrder,
    nextSession: next ? { session: next.session } : null,
    completedToday: todays,
    dailyGoal: DAILY_SESSION_GOAL,
  };
}

export function useGuidedJourneyProgress(): JourneySummary & { loading: boolean } {
  const { user } = useAuth();
  const { locale } = useI18n();
  const checklist = useQuery({
    queryKey: ['journey-checklist', locale],
    queryFn: () => fetchJourneyChecklist(locale),
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  const state = useQuery({
    queryKey: ['journey', 'state'],
    queryFn: fetchJourneyState,
    staleTime: 60 * 1000,
    enabled: !!user,
  });
  return { ...summarizeJourney(checklist.data ?? [], state.data), loading: checklist.isLoading || state.isLoading };
}
