/**
 * Guided Journey progress for the My Journey hero card.
 *
 * Combines the published curriculum (useJourneyChecklist → 90 sessions / 250
 * topics) with the user's durable journey state (GET /api/v1/journey/state →
 * completedTopicIds). The state read goes through React Query under a stable key
 * so it can be invalidated the moment a practice is marked done in the catalog —
 * that's what makes the hero ring fill dynamically.
 *
 * Ring fills smoothly by topics/practices completed; the headline number is
 * sessions learned (a session counts once every topic in it is completed).
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { communityFetch } from '@/lib/community-gateway';
import { useJourneyChecklist } from '@/hooks/useJourneyChecklist';

/** React Query key for the durable journey state (shared for live invalidation). */
export const JOURNEY_STATE_QUERY_KEY = ['journey', 'state'] as const;

interface JourneyStateProgress {
  completedTopicIds: string[];
  completedPracticeCount: number;
}

export interface GuidedJourneyProgress {
  completedTopics: number;
  totalTopics: number;
  completedSessions: number;
  totalSessions: number;
  /** Ring fill percentage, 0–100, driven by topics completed. */
  pct: number;
  /** Per-topic completion lookup — drives the catalog's green checkmarks. */
  completedSet: Set<string>;
  loading: boolean;
}

export function useGuidedJourneyProgress(): GuidedJourneyProgress {
  const { user } = useAuth();
  const { sessions, topics, loading: checklistLoading } = useJourneyChecklist();

  const { data: state, isLoading: stateLoading } = useQuery({
    queryKey: JOURNEY_STATE_QUERY_KEY,
    queryFn: async (): Promise<JourneyStateProgress> => {
      const resp = await communityFetch('/api/v1/journey/state');
      const json = await resp.json();
      if (resp.ok && json?.ok && json.state) {
        return {
          completedTopicIds: Array.isArray(json.state.completedTopicIds)
            ? json.state.completedTopicIds
            : [],
          completedPracticeCount:
            typeof json.state.completedPracticeCount === 'number'
              ? json.state.completedPracticeCount
              : 0,
        };
      }
      return { completedTopicIds: [], completedPracticeCount: 0 };
    },
    staleTime: 60 * 1000,
    enabled: !!user,
  });

  const completedSet = new Set(state?.completedTopicIds ?? []);

  const totalTopics = topics.length;
  // Intersect with the published curriculum so stale ids can't push past 100%.
  const completedTopics = topics.reduce(
    (n, t) => (completedSet.has(t.topicId) ? n + 1 : n),
    0,
  );

  const totalSessions = sessions.length;
  const completedSessions = sessions.reduce(
    (n, s) =>
      s.topics.length > 0 && s.topics.every((t) => completedSet.has(t.topicId))
        ? n + 1
        : n,
    0,
  );

  const pct = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  return {
    completedTopics,
    totalTopics,
    completedSessions,
    totalSessions,
    pct,
    completedSet,
    loading: checklistLoading || stateLoading,
  };
}
