/**
 * Keeps the News Feed loaded for the whole authenticated session.
 *
 * The problem this solves: the News screen is a route component, so navigating
 * to Messenger / Events / anywhere else UNMOUNTS it. Every one of its queries
 * then became inactive, and returning to the feed re-entered the loading path —
 * the feed visibly reloaded, and after a longer detour (past the cache's gcTime)
 * it reloaded completely cold, spinner and all.
 *
 * Mounting this hook once, high in the authenticated tree, holds a live observer
 * on the exact same query keys the News screen reads. That has three effects:
 *
 *   1. The feed is fetched once, right after login — not on first arrival at
 *      /home, and not again on every return.
 *   2. The cache entries never go inactive, so they are never garbage-collected
 *      out from under the screen no matter how long the user spends elsewhere.
 *   3. Realtime keeps them fresh in the background, so coming back to the feed
 *      is a pure cache read: instant paint, no spinner, no network wait.
 *
 * Cost is one feed load per session rather than one per visit — strictly less
 * work than the previous behaviour, not more.
 */
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  allNewsFeedKey,
  fetchNewsFeedCandidates,
  useFeedRealtimeRefresh,
  FEED_CANDIDATES_STALE_TIME,
  FEED_CANDIDATES_GC_TIME,
} from '@/hooks/useAllNewsFeed';
import { useLongevityNewsFeed } from '@/hooks/useNewsFeed';
import { isFeedV2Enabled } from '@/lib/feature-flags';

export function useNewsFeedKeepAlive(): void {
  const { session, user, loading } = useAuth();
  const { selectedLanguage } = useLanguage();
  const language = selectedLanguage?.split('-')[0] || 'en';
  const userId = user?.id ?? null;
  const token = session?.access_token ?? null;

  // Only for signed-in users, and only once auth has settled — firing while
  // `loading` is true would fetch under a null user and cache a feed missing
  // every viewer-scoped filter.
  const enabled = !loading && !!userId;

  // The unified "All" feed candidates (posts, videos, spotlight, announcements).
  useQuery({
    queryKey: allNewsFeedKey(userId, language),
    queryFn: () => fetchNewsFeedCandidates(userId, token),
    enabled: enabled && isFeedV2Enabled(),
    staleTime: FEED_CANDIDATES_STALE_TIME,
    gcTime: FEED_CANDIDATES_GC_TIME,
    refetchOnWindowFocus: false,
  });

  // The paginated longevity-news tail. Holding this active also preserves every
  // page the user already scrolled through, so returning to the feed restores
  // the full stream instead of collapsing back to page one.
  useLongevityNewsFeed({ limit: 20, enabled });

  useFeedRealtimeRefresh(enabled);
}
