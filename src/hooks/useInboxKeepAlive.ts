/**
 * Keeps the Inbox thread list loaded for the whole authenticated session.
 *
 * Same problem as useNewsFeedKeepAlive.ts, same fix, applied to Inbox: the
 * screen is a route component, so navigating to News/Events/anywhere else
 * UNMOUNTS it. `global-threads` (DM threads) and `chat-groups` then went
 * inactive and were garbage-collected once the user spent longer than their
 * gcTime elsewhere — returning to /inbox re-entered the loading path from
 * cold, which read as "it reloaded" even though nothing had actually changed.
 *
 * Mounting this hook once, high in the authenticated tree, holds a live
 * observer on the exact same query keys the Inbox screen reads, so those
 * cache entries are never garbage-collected no matter how long the user
 * spends elsewhere. Returning to /inbox becomes a pure cache read.
 *
 * Deliberately does NOT call the full useGlobalMessages()/useChatGroupsAsThreads()
 * hooks — both bundle their own realtime subscription (a fixed/derived Supabase
 * channel name), and mounting those a second time here would double-subscribe
 * and double-fire every realtime event. This only re-runs the bare queries
 * (same keys + fetchers the real hooks use), mirroring how
 * useNewsFeedKeepAlive.ts holds the risky all-news-feed query.
 */
import { useAuth } from '@/context/AuthProvider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buildGlobalThreadsQueryFn } from '@/hooks/useGlobalMessages';
import { chatGroupsQueryKey } from '@/hooks/useChatGroupsAsThreads';
import { fetchGroups } from '@/hooks/useChatApi';

// Must match useGlobalMessages.ts's STALE_TIME/GC_TIME for `global-threads`.
const THREADS_STALE_TIME = 10 * 60 * 1000;
const THREADS_GC_TIME = 30 * 60 * 1000;

// Must match useChatGroupsAsThreads.ts's staleTime/gcTime for `chat-groups`.
const GROUPS_STALE_TIME = 2 * 60 * 1000;
const GROUPS_GC_TIME = 30 * 60 * 1000;

export function useInboxKeepAlive(): void {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const enabled = !loading && !!userId;

  useQuery({
    queryKey: ['global-threads', userId],
    queryFn: ({ queryKey }) =>
      userId ? buildGlobalThreadsQueryFn(userId, queryClient, queryKey) : Promise.resolve([]),
    enabled,
    staleTime: THREADS_STALE_TIME,
    gcTime: THREADS_GC_TIME,
  });

  useQuery({
    queryKey: chatGroupsQueryKey(userId ?? undefined),
    queryFn: fetchGroups,
    enabled,
    staleTime: GROUPS_STALE_TIME,
    gcTime: GROUPS_GC_TIME,
  });
}
