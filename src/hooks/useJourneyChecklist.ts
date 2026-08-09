/**
 * VTID-03280 — Guided Journey: published checklist reader (P5, vitana-v1).
 *
 * Reads the published 90-session / 250-topic curriculum from the gateway
 * (P2: GET /api/v1/journey-checklist → published snapshot, draft fallback).
 * Groups topics by session for the My Journey catalog.
 */

import { useQuery } from '@tanstack/react-query';
import { communityFetch } from '@/lib/community-gateway';
import { getI18nLocale } from '@/lib/i18n-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface UseJourneyChecklist {
  topics: PublicTopic[];
  sessions: JourneySession[];
  chapters: string[];
  loading: boolean;
  error: string | null;
}

/** Shared query key builder — also used by the prefetch registry so the two can't drift. */
export function journeyChecklistQueryKey(locale: string) {
  return ['journey-checklist', locale] as const;
}

/**
 * Shared query function so the hook and the prefetch registry hit the exact
 * same request (same pattern as fetchCommunityEventsQueryFn / buildGlobalThreadsQueryFn).
 */
export async function fetchJourneyChecklist(locale: string): Promise<PublicTopic[]> {
  // Pass the live UI language so the curriculum content (authored in German)
  // is served translated, not just the field labels.
  const resp = await communityFetch(
    `/api/v1/journey-checklist?locale=${encodeURIComponent(locale)}`,
  );
  const json = await resp.json();
  if (!resp.ok || !json?.ok) {
    throw new Error(json?.error || 'load_failed');
  }
  return Array.isArray(json.topics) ? json.topics : [];
}

export function useJourneyChecklist(): UseJourneyChecklist {
  // Reactive UI language — drives a refetch so switching language while My
  // Journey is mounted reloads the curriculum in the new locale (not just labels).
  const { selectedLanguage } = useLanguage();
  const locale = (selectedLanguage || getI18nLocale() || 'de').split('-')[0];

  // The published 90-session/250-topic curriculum changes rarely (it's an
  // editorial publish, not per-user data) — cache it generously so navigating
  // away from My Journey and back doesn't re-run the full fetch every time.
  // Previously this was a plain useEffect+useState hook with no cache at all,
  // so every remount reset to loading=true/topics=[] and reloaded from
  // scratch, which is what made the guided-journey hero take several seconds
  // and show zeros on every return visit.
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
      const ts = bySession.get(s)!.slice().sort((a, b) => a.position - b.position);
      return { session: s, chapterId: ts[0]?.chapterId ?? '', topics: ts };
    });

  const chapters = Array.from(new Set(sessions.map((s) => s.chapterId).filter(Boolean)));

  return { topics, sessions, chapters, loading, error };
}
