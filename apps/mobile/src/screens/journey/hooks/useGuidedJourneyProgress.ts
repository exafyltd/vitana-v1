/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — native twin of
 * `src/hooks/useGuidedJourneyProgress.ts` (362; community gateway +
 * localStorage, so class-B and re-implemented). The curriculum
 * (`useJourneyChecklist`) plus the durable journey state
 * (`GET /journey/state`, React Query key `["journey", "state"]`, invalidated
 * after a listen or a practice) give the hero ring, the next session and the
 * daily goal, with the same rules as the web.
 *
 * The two per-device records the web keeps in localStorage — the listened
 * sessions (`vitana.guidedJourney.listenedSessions.v1.<user>`) and today's
 * listens (`vitana.guidedJourney.dailyListened.v1.<user>`, reset when the day
 * rolls over) — use the native key-value store: AsyncStorage is async, so the
 * records are mirrored in memory (read synchronously during render like the
 * web's localStorage) and hydrated once per member.
 */
import { useEffect, useState } from 'react';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/AuthProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { communityFetch } from '../data/client';
import { localDateKey, useJourneyChecklist, type PublicTopic } from '../data/journey';

export const JOURNEY_STATE_QUERY_KEY = ['journey', 'state'] as const;
const LISTENED_SESSIONS_STORAGE_PREFIX = 'vitana.guidedJourney.listenedSessions.v1';
const DAILY_LISTENED_STORAGE_PREFIX = 'vitana.guidedJourney.dailyListened.v1';
/** VTID-04763: one episode a day. */
export const DAILY_SESSION_GOAL = 1;

interface JourneyStateProgress {
  completedTopicIds: string[];
  completedListenedTopicIds: string[];
  completedSessionNumbers: number[];
  completedPracticeCount: number;
  dailyListen?: { date: string; sessions: number[] } | null;
  audiobookReminder?: { time: string; tz: string } | null;
}

export interface NextJourneySession {
  session: number;
  topic: PublicTopic;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
}
const stringArray = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);
const uniqueNumbers = (values: number[]) => Array.from(new Set(values));
const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const listenedKey = (userId?: string | null) => (userId ? `${LISTENED_SESSIONS_STORAGE_PREFIX}.${userId}` : LISTENED_SESSIONS_STORAGE_PREFIX);
const dailyKey = (userId?: string | null) => (userId ? `${DAILY_LISTENED_STORAGE_PREFIX}.${userId}` : DAILY_LISTENED_STORAGE_PREFIX);

// In-memory mirror of the two device records (key → raw JSON string).
const mirror = new Map<string, string | null>();
const hydrated = new Set<string>();

async function hydrate(userId: string | null): Promise<void> {
  for (const key of [listenedKey(userId), dailyKey(userId)]) {
    if (hydrated.has(key)) continue;
    hydrated.add(key);
    const v = await deviceStorage.getItem(key);
    if (!mirror.has(key)) mirror.set(key, v);
  }
}

function write(key: string, value: string) {
  mirror.set(key, value);
  void deviceStorage.setItem(key, value);
}

/** Test helper: forget the in-memory mirror. */
export function __resetGuidedProgressStorageForTests(): void {
  mirror.clear();
  hydrated.clear();
}

function readStoredListenedSessions(userId?: string | null): number[] {
  try {
    const raw = mirror.get(listenedKey(userId));
    return numberArray(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function readDailyListenedSessions(userId?: string | null): number[] {
  try {
    const raw = mirror.get(dailyKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date?: unknown; sessions?: unknown };
    if (parsed?.date !== localDateKey()) return [];
    return numberArray(parsed.sessions);
  } catch {
    return [];
  }
}

function rememberListenedSession(session: number, userId?: string | null) {
  if (!Number.isInteger(session) || session <= 0) return;
  write(listenedKey(userId), JSON.stringify(uniqueNumbers([...readStoredListenedSessions(userId), session]).sort((a, b) => a - b)));
}

function rememberDailyListen(session: number, userId?: string | null) {
  if (!Number.isInteger(session) || session <= 0) return;
  const next = uniqueNumbers([...readDailyListenedSessions(userId), session]).sort((a, b) => a - b);
  write(dailyKey(userId), JSON.stringify({ date: localDateKey(), sessions: next }));
}

function parseDailyListen(value: unknown): { date: string; sessions: number[] } | null {
  const v = value as { date?: unknown; sessions?: unknown } | null;
  if (!v || typeof v.date !== 'string') return null;
  return { date: v.date, sessions: numberArray(v.sessions) };
}

/** Optimistic listen: the device records plus the journey-state cache (web :194-218). */
export function markSessionListenedInJourneyState(queryClient: QueryClient, session: number, topicId?: string, userId?: string | null) {
  rememberListenedSession(session, userId);
  rememberDailyListen(session, userId);
  queryClient.setQueryData<JourneyStateProgress>(JOURNEY_STATE_QUERY_KEY, (prev) => {
    const current: JourneyStateProgress = prev ?? { completedTopicIds: [], completedListenedTopicIds: [], completedSessionNumbers: [], completedPracticeCount: 0 };
    return {
      ...current,
      completedListenedTopicIds: topicId ? uniqueStrings([...current.completedListenedTopicIds, topicId]) : current.completedListenedTopicIds,
      completedSessionNumbers: uniqueNumbers([...current.completedSessionNumbers, session]),
    };
  });
}

export async function fetchJourneyState(userId: string | null): Promise<JourneyStateProgress> {
  await hydrate(userId);
  const resp = await communityFetch('/journey/state');
  const json = await resp.json<{ ok?: boolean; state?: Record<string, unknown> }>().catch(() => ({}) as { ok?: boolean; state?: Record<string, unknown> });
  if (resp.ok && json?.ok && json.state) {
    const s = json.state;
    const currentSession = typeof s.currentSession === 'number' ? s.currentSession : 0;
    const fromCurrentSession = currentSession > 1 ? Array.from({ length: currentSession - 1 }, (_, i) => i + 1) : [];
    return {
      completedTopicIds: stringArray(s.completedTopicIds),
      completedListenedTopicIds: [...stringArray(s.completedListenedTopicIds), ...stringArray(s.listenedTopicIds), ...stringArray(s.sessionListenedTopicIds)],
      completedSessionNumbers: [
        ...fromCurrentSession,
        ...numberArray(s.completedSessionNumbers),
        ...numberArray(s.completedSessions),
        ...numberArray(s.listenedSessions),
        ...numberArray(s.listenedSessionNumbers),
        ...readStoredListenedSessions(userId),
      ],
      completedPracticeCount: typeof s.completedPracticeCount === 'number' ? s.completedPracticeCount : 0,
      dailyListen: parseDailyListen(s.dailyListen),
    };
  }
  return { completedTopicIds: [], completedListenedTopicIds: [], completedSessionNumbers: readStoredListenedSessions(userId), completedPracticeCount: 0 };
}

export function useGuidedJourneyProgress() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { sessions, topics, loading: checklistLoading } = useJourneyChecklist();
  const [, setHydratedTick] = useState(0);
  useEffect(() => {
    let active = true;
    void hydrate(userId).then(() => active && setHydratedTick((n) => n + 1));
    return () => {
      active = false;
    };
  }, [userId]);

  const { data: state, isLoading: stateLoading } = useQuery({
    queryKey: JOURNEY_STATE_QUERY_KEY,
    queryFn: () => fetchJourneyState(userId),
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const completedSet = new Set(state?.completedTopicIds ?? []);
  const completedListenedTopicIds = new Set(state?.completedListenedTopicIds ?? []);
  const totalTopics = topics.length;
  const completedTopics = topics.reduce((n, t) => (completedSet.has(t.topicId) ? n + 1 : n), 0);
  const totalSessions = sessions.length;
  const explicit = new Set<number>(state?.completedSessionNumbers ?? []);
  const listenedSessionSet = new Set<number>();
  for (const s of sessions) {
    const hasListenedTopic = s.topics.some((t) => completedListenedTopicIds.has(t.topicId));
    const allTopicsCompleted = s.topics.length > 0 && s.topics.every((t) => completedSet.has(t.topicId));
    if (explicit.has(s.session) || hasListenedTopic || allTopicsCompleted) listenedSessionSet.add(s.session);
  }
  const completedSessions = listenedSessionSet.size;
  let completedInOrder = 0;
  for (const s of sessions) {
    if (!listenedSessionSet.has(s.session)) break;
    completedInOrder += 1;
  }
  const pct = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;
  let nextSession: NextJourneySession | null = null;
  for (const s of sessions) {
    if (!listenedSessionSet.has(s.session)) {
      const topic = s.topics.find((t) => !completedSet.has(t.topicId)) ?? s.topics[0];
      if (!topic) continue;
      nextSession = { session: s.session, topic };
      break;
    }
  }
  const serverToday = state?.dailyListen && state.dailyListen.date === localDateKey() ? state.dailyListen.sessions : [];
  const completedToday = uniqueNumbers([...serverToday, ...readDailyListenedSessions(userId)]).length;
  const dailyGoal = DAILY_SESSION_GOAL;
  const remainingToday = Math.max(0, dailyGoal - completedToday);
  const dailyGoalMet = completedToday >= dailyGoal;

  return {
    completedTopics,
    totalTopics,
    completedSessions,
    completedInOrder,
    totalSessions,
    pct,
    completedSet,
    listenedSessionSet,
    nextSession,
    dailyGoal,
    completedToday,
    remainingToday,
    dailyGoalMet,
    loading: checklistLoading || stateLoading,
  };
}

export type GuidedJourneyProgress = ReturnType<typeof useGuidedJourneyProgress>;
