/**
 * Keeps Community Events data loaded for the whole authenticated session.
 *
 * Same problem as useNewsFeedKeepAlive.ts, same fix, applied to Events: the
 * screen is a route component, so navigating to News/Inbox/anywhere else
 * UNMOUNTS it. `global-community-events` and `following-feed` then went
 * inactive and were garbage-collected once the user spent longer than their
 * gcTime elsewhere — returning to /comm/events-meetups re-entered the loading
 * path from cold, which read as "it reloaded" even though nothing had
 * actually changed. Events had no keep-alive at all before this (News is the
 * only screen the pattern was previously finished for).
 *
 * Deliberately does NOT call the full useCommunityEvents() hook — it bundles
 * its own realtime subscription on a fixed channel name
 * ('events-realtime-changes'), and mounting it a second time here would
 * double-subscribe and double-fire every realtime event. This only re-runs
 * the bare query (same key + fetcher the real hook uses), the same way
 * prefetch-registry.ts warms this query and useNewsFeedKeepAlive.ts holds the
 * risky all-news-feed query.
 */
import { useAuth } from '@/context/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';

// Must match useCommunityEvents.ts's staleTime for `global-community-events`.
const EVENTS_STALE_TIME = 2 * 60 * 1000;

export function useEventsKeepAlive(): void {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const enabled = !loading && !!userId;

  useQuery({
    queryKey: ['global-community-events', userId ?? 'anonymous'],
    queryFn: fetchCommunityEventsQueryFn,
    enabled,
    staleTime: EVENTS_STALE_TIME,
  });

  // useFollowingFeed has no bundled realtime subscription — safe to hold via
  // the real hook directly, same as useNewsFeedKeepAlive does for
  // useLongevityNewsFeed.
  useFollowingFeed();
}
