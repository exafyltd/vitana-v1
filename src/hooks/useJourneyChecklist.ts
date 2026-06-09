/**
 * VTID-03280 — Guided Journey: published checklist reader (P5, vitana-v1).
 *
 * Reads the published 90-session / 250-topic curriculum from the gateway
 * (P2: GET /api/v1/journey-checklist → published snapshot, draft fallback).
 * Groups topics by session for the My Journey catalog.
 */

import { useState, useEffect } from 'react';
import { communityFetch } from '@/lib/community-gateway';

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

export function useJourneyChecklist(): UseJourneyChecklist {
  const [topics, setTopics] = useState<PublicTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await communityFetch('/api/v1/journey-checklist');
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.ok) {
          setTopics(Array.isArray(json.topics) ? json.topics : []);
          setError(null);
        } else {
          setError(json?.error || 'load_failed');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'load_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
