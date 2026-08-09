/**
 * Guided Journey progress for the My Journey hero card.
 *
 * Combines the published curriculum (useJourneyChecklist → 90 sessions / 250
 * topics) with the user's durable journey state (GET /api/v1/journey/state).
 * The state read goes through React Query under a stable key so it can be
 * invalidated the moment a session is listened to or a practice is marked done —
 * that's what makes the hero ring and checklist update dynamically.
 *
 * Guided onboarding advances by listened sessions: after the user listens to
 * session 1, the next CTA becomes session 2. Topic completion remains available
 * for individual practice checkmarks.
 */

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { communityFetch } from '@/lib/community-gateway';
import { useJourneyChecklist, type PublicTopic } from '@/hooks/useJourneyChecklist';

/** React Query key for the durable journey state (shared for live invalidation). */
export const JOURNEY_STATE_QUERY_KEY = ['journey', 'state'] as const;
const LISTENED_SESSIONS_STORAGE_PREFIX = 'vitana.guidedJourney.listenedSessions.v1';
/**
 * Daily-goal storage. The backend journey state only tracks all-time progress,
 * so the "5 sessions today" motivator is kept client-side: a per-user record of
 * which session numbers were listened to *today*. It auto-resets at midnight —
 * any record whose stored date isn't today reads back as empty, so every new
 * day starts the countdown fresh at DAILY_SESSION_GOAL.
 */
const DAILY_LISTENED_STORAGE_PREFIX = 'vitana.guidedJourney.dailyListened.v1';
/** Sessions we encourage the user to complete each day. */
export const DAILY_SESSION_GOAL = 5;

interface JourneyStateProgress {
  completedTopicIds: string[];
  completedListenedTopicIds: string[];
  completedSessionNumbers: number[];
  completedPracticeCount: number;
}

export interface NextJourneySession {
  /** Session number the user should start next (first incomplete in order). */
  session: number;
  /** That session's first incomplete topic — what a tap activates. */
  topic: PublicTopic;
}

export interface GuidedJourneyProgress {
  completedTopics: number;
  totalTopics: number;
  completedSessions: number;
  /**
   * Sessions completed contiguously from the start (in curriculum order, no
   * gaps). Unlike `completedSessions` (the raw distinct count), this stays in
   * lock-step with `nextSession`: finish 1–9 in order and this is 9 while the
   * next session is 10. The card uses this so it can never show the
   * contradictory "9 done · now 9" / "10 done · now 10" state that a raw count
   * produces when a later session is completed out of order.
   */
  completedInOrder: number;
  totalSessions: number;
  /** Ring fill percentage, 0–100, driven by listened sessions. */
  pct: number;
  /** Per-topic completion lookup — drives the catalog's green checkmarks. */
  completedSet: Set<string>;
  /** Per-session listened lookup — drives the session-level Erledigt state. */
  listenedSessionSet: Set<number>;
  /** The next session to start — drives the "Start your session N" hero card. */
  nextSession: NextJourneySession | null;
  /** Daily motivator target (sessions to complete today). */
  dailyGoal: number;
  /** Distinct sessions the user has listened to *today* (optimistic, local). */
  completedToday: number;
  /** Sessions still to do today — counts DOWN from dailyGoal to 0. */
  remainingToday: number;
  /** True once the user has hit the daily goal — show the medal / 100% state. */
  dailyGoalMet: boolean;
  loading: boolean;
}

/** Local YYYY-MM-DD key (used only as an internal day bucket, never displayed). */
function localDayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function listenedSessionsStorageKey(userId?: string | null): string {
  return userId ? `${LISTENED_SESSIONS_STORAGE_PREFIX}.${userId}` : LISTENED_SESSIONS_STORAGE_PREFIX;
}

function readStoredListenedSessions(userId?: string | null): number[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(listenedSessionsStorageKey(userId));
    return numberArray(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function rememberListenedSession(session: number, userId?: string | null) {
  if (!Number.isInteger(session) || session <= 0) return;
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const next = uniqueNumbers([...readStoredListenedSessions(userId), session]).sort((a, b) => a - b);
    window.localStorage.setItem(listenedSessionsStorageKey(userId), JSON.stringify(next));
  } catch {
    /* local persistence is best-effort; the React Query cache still updates. */
  }
}

function dailyListenedStorageKey(userId?: string | null): string {
  return userId
    ? `${DAILY_LISTENED_STORAGE_PREFIX}.${userId}`
    : DAILY_LISTENED_STORAGE_PREFIX;
}

/** Distinct session numbers listened today (empty once the stored day rolls over). */
function readDailyListenedSessions(userId?: string | null): number[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(dailyListenedStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date?: unknown; sessions?: unknown };
    // A record from a previous day resets the counter — new day, fresh goal.
    if (parsed?.date !== localDayKey()) return [];
    return numberArray(parsed.sessions);
  } catch {
    return [];
  }
}

function rememberDailyListen(session: number, userId?: string | null) {
  if (!Number.isInteger(session) || session <= 0) return;
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const next = uniqueNumbers([...readDailyListenedSessions(userId), session]).sort(
      (a, b) => a - b,
    );
    window.localStorage.setItem(
      dailyListenedStorageKey(userId),
      JSON.stringify({ date: localDayKey(), sessions: next }),
    );
  } catch {
    /* daily-goal tracking is best-effort; the React Query cache still updates. */
  }
}

export function markSessionListenedInJourneyState(
  queryClient: QueryClient,
  session: number,
  topicId?: string,
  userId?: string | null,
) {
  rememberListenedSession(session, userId);
  rememberDailyListen(session, userId);
  queryClient.setQueryData<JourneyStateProgress>(JOURNEY_STATE_QUERY_KEY, (prev) => {
    const current: JourneyStateProgress = prev ?? {
      completedTopicIds: [],
      completedListenedTopicIds: [],
      completedSessionNumbers: [],
      completedPracticeCount: 0,
    };

    return {
      ...current,
      completedListenedTopicIds: topicId
        ? uniqueStrings([...current.completedListenedTopicIds, topicId])
        : current.completedListenedTopicIds,
      completedSessionNumbers: uniqueNumbers([...current.completedSessionNumbers, session]),
    };
  });
}

/**
 * Shared query function so the hook and the prefetch registry hit the exact
 * same request and can't drift (same pattern as fetchJourneyChecklist).
 */
export async function fetchJourneyState(userId: string | null): Promise<JourneyStateProgress> {
  const resp = await communityFetch('/api/v1/journey/state');
  const json = await resp.json();
  if (resp.ok && json?.ok && json.state) {
    const rawState = json.state as Record<string, unknown>;
    // Durable, account-scoped progress: `currentSession` is the session the
    // user is ON, so sessions 1..(currentSession-1) are listened/complete.
    // This is what makes the ring survive a localStorage clear and stay
    // consistent across devices/origins (staging vs production) — the server
    // is now the source of truth, with localStorage only as an optimistic
    // overlay for the just-tapped session.
    const currentSession =
      typeof rawState.currentSession === 'number' ? rawState.currentSession : 0;
    const fromCurrentSession =
      currentSession > 1
        ? Array.from({ length: currentSession - 1 }, (_, i) => i + 1)
        : [];
    return {
      completedTopicIds: stringArray(rawState.completedTopicIds),
      completedListenedTopicIds: [
        ...stringArray(rawState.completedListenedTopicIds),
        ...stringArray(rawState.listenedTopicIds),
        ...stringArray(rawState.sessionListenedTopicIds),
      ],
      completedSessionNumbers: [
        ...fromCurrentSession,
        ...numberArray(rawState.completedSessionNumbers),
        ...numberArray(rawState.completedSessions),
        ...numberArray(rawState.listenedSessions),
        ...numberArray(rawState.listenedSessionNumbers),
        ...readStoredListenedSessions(userId),
      ],
      completedPracticeCount:
        typeof rawState.completedPracticeCount === 'number'
          ? rawState.completedPracticeCount
          : 0,
    };
  }
  return {
    completedTopicIds: [],
    completedListenedTopicIds: [],
    completedSessionNumbers: readStoredListenedSessions(userId),
    completedPracticeCount: 0,
  };
}

export function useGuidedJourneyProgress(): GuidedJourneyProgress {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { sessions, topics, loading: checklistLoading } = useJourneyChecklist();

  const { data: state, isLoading: stateLoading } = useQuery({
    queryKey: JOURNEY_STATE_QUERY_KEY,
    queryFn: () => fetchJourneyState(userId),
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const completedSet = new Set(state?.completedTopicIds ?? []);
  const completedListenedTopicIds = new Set(state?.completedListenedTopicIds ?? []);

  const totalTopics = topics.length;
  // Intersect with the published curriculum so stale ids can't push past 100%.
  const completedTopics = topics.reduce(
    (n, t) => (completedSet.has(t.topicId) ? n + 1 : n),
    0,
  );

  const totalSessions = sessions.length;
  const explicitListenedSessionSet = new Set<number>(state?.completedSessionNumbers ?? []);
  const listenedSessionSet = new Set<number>();
  for (const s of sessions) {
    const hasExplicitSession = explicitListenedSessionSet.has(s.session);
    const hasListenedTopic = s.topics.some((t) => completedListenedTopicIds.has(t.topicId));
    const allTopicsCompleted =
      s.topics.length > 0 && s.topics.every((t) => completedSet.has(t.topicId));
    if (hasExplicitSession || hasListenedTopic || allTopicsCompleted) {
      listenedSessionSet.add(s.session);
    }
  }
  const completedSessions = listenedSessionSet.size;

  // Contiguous progress from the start, in curriculum order: count leading
  // sessions until the first gap. This is the count we surface on the journey
  // card's "Erledigt" step — it equals nextSession − 1, so the stepper always
  // reads as a coherent sequence (… 9 done → 10 now …) instead of colliding.
  let completedInOrder = 0;
  for (const s of sessions) {
    if (!listenedSessionSet.has(s.session)) break;
    completedInOrder += 1;
  }

  const pct = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  // The next session = first session (in curriculum order) not listened yet;
  // its first incomplete topic is what the hero card activates.
  let nextSession: NextJourneySession | null = null;
  for (const s of sessions) {
    if (!listenedSessionSet.has(s.session)) {
      const topic = s.topics.find((t) => !completedSet.has(t.topicId)) ?? s.topics[0];
      if (!topic) continue;
      nextSession = { session: s.session, topic };
      break;
    }
  }

  // Daily motivator — distinct sessions listened today (optimistic/local). Read
  // here in the body so it refreshes whenever the journey-state cache changes
  // (markSessionListenedInJourneyState updates that cache on every tap) and
  // resets on its own once the calendar day rolls over.
  const completedToday = readDailyListenedSessions(userId).length;
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
