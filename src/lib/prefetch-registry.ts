/**
 * Prefetch Registry - Central registry of query configurations for background prefetching
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_SHORTS_PARAMS } from '@/hooks/useShorts';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { getFindPartnerMatches, getIntentBoard } from '@/lib/intentApi';
import { buildGlobalThreadsQueryFn, buildGlobalMessagesQueryFn } from '@/hooks/useGlobalMessages';
import { chatGroupsQueryKey, isChatGroupThreadId } from '@/hooks/useChatGroupsAsThreads';
import { fetchGroups } from '@/hooks/useChatApi';
import { communityFetch } from '@/lib/community-gateway';
import {
  SCHEDULED_STREAMS_KEY,
  LIVE_STREAMS_KEY,
  fetchScheduledStreams,
  fetchLiveStreams,
} from '@/hooks/useLiveStreams';
import {
  communityNewsKey,
  fetchCommunityNews,
  longevityNewsKey,
  fetchLongevityNews,
} from '@/hooks/useNewsFeed';
import { journeyChecklistQueryKey, fetchJourneyChecklist } from '@/hooks/useJourneyChecklist';
import { JOURNEY_STATE_QUERY_KEY, fetchJourneyState } from '@/hooks/useGuidedJourneyProgress';

/**
 * Map of adjacent pillars to prefetch when on a given route
 * Routes must match actual app routes (/comm not /community)
 */
export const ADJACENT_PILLARS: Record<string, string[]> = {
  '/autopilot': ['/home', '/comm', '/inbox', '/comm/live-rooms', '/comm/media-hub'],
  '/home': ['/comm', '/discover', '/health', '/business', '/wallet', '/inbox', '/comm/find-partner', '/autopilot'],
  '/comm': ['/home', '/discover', '/inbox', '/comm/find-partner'],
  '/discover': ['/home', '/comm', '/calendar'],
  '/health': ['/home', '/calendar'],
  '/business': ['/home', '/wallet'],
  '/wallet': ['/home', '/business'],
  '/calendar': ['/home', '/health'],
  '/inbox': ['/home', '/comm'],
};

/**
 * Execute prefetch for a specific path
 */
export async function prefetchForPath(
  queryClient: QueryClient,
  path: string,
  userId: string | undefined,
  tenantId: string | undefined
): Promise<void> {
  if (!userId) return;

  const staleTime = 2 * 60 * 1000;
  const eventsKey = ['global-community-events', userId ?? 'anonymous'];

  // My Journey / Autopilot — the post-login landing screen. Warm both the
  // journey summary and the onboarding recommendations so the screen paints
  // from cache on first arrival. Keys MUST match the hooks (user-scoped).
  if (path === '/autopilot') {
    // 'de' matches LanguageContext's documented default for the primary user
    // base. If a user's resolved locale differs, this prefetch simply goes
    // unused (the hook's own queryKey won't match) — no correctness issue,
    // just a missed optimization for non-German users.
    const journeyLocale = 'de';
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['my-journey', userId],
        queryFn: async () => {
          const res = await communityFetch('/api/v1/my-journey');
          if (!res.ok) throw new Error('Failed to fetch my-journey');
          return res.json();
        },
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: ['autopilot-onboarding', userId],
        queryFn: async () => {
          const res = await communityFetch(
            '/api/v1/autopilot/recommendations?status=new,activated,completed&limit=100',
          );
          if (!res.ok) throw new Error('Failed to fetch autopilot recommendations');
          return res.json();
        },
        staleTime,
      }),
      // Guided Journey hero data — the 90-session curriculum (rarely changes,
      // long staleTime matches the hook) and the user's durable progress.
      // Warming these is what stops the "0 of 0 for several seconds" flash
      // the FIRST time /autopilot is opened after a fresh load.
      queryClient.prefetchQuery({
        queryKey: journeyChecklistQueryKey(journeyLocale),
        queryFn: () => fetchJourneyChecklist(journeyLocale),
        staleTime: 10 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: JOURNEY_STATE_QUERY_KEY,
        queryFn: () => fetchJourneyState(userId ?? null),
        staleTime: 60 * 1000,
      }),
    ]);
  }

  // Home (News feed) — longevity + community news. Longevity is an infinite
  // query; its language segment must match the hook (selectedLanguage → 2-letter
  // code, default 'de'). A session token is needed for the longevity endpoint.
  if (path === '/home') {
    const newsStale = 5 * 60 * 1000;
    let lang = 'de';
    try {
      lang = (localStorage.getItem('vitana.lang') || 'de-DE').split('-')[0] || 'de';
    } catch {
      /* SSR / private mode — fall back to default */
    }
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    const viewerId = session?.user?.id ?? null;
    await Promise.all([
      queryClient.prefetchInfiniteQuery({
        queryKey: longevityNewsKey(undefined, 20, lang),
        queryFn: ({ pageParam = 1 }) =>
          fetchLongevityNews(pageParam as number, token, { limit: 20, language: lang }),
        initialPageParam: 1,
        staleTime: newsStale,
      }),
      queryClient.prefetchQuery({
        queryKey: communityNewsKey(15, viewerId),
        queryFn: () => fetchCommunityNews(15, viewerId),
        staleTime: newsStale,
      }),
    ]);
  }

  // Live Rooms — scheduled + live streams (public). Reuses the exact hook keys.
  if (path === '/comm/live-rooms') {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: SCHEDULED_STREAMS_KEY,
        queryFn: fetchScheduledStreams,
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: LIVE_STREAMS_KEY,
        queryFn: fetchLiveStreams,
        staleTime,
      }),
    ]);
  }

  // Prefetch based on path
  if (path.startsWith('/business')) {
    await queryClient.prefetchQuery({
      queryKey: ['business-packages', userId, tenantId],
      queryFn: async () => {
        if (!tenantId) return [];
        const { data } = await supabase.from('business_packages').select('*').eq('creator_id', userId).eq('tenant_id', tenantId).limit(20);
        return data || [];
      },
      staleTime,
    });
  }

  if (path.startsWith('/health')) {
    await queryClient.prefetchQuery({
      queryKey: ['health-plans'],
      queryFn: async () => {
        const { data } = await supabase.from('user_health_plans').select('*').eq('active', true).limit(10);
        return data || [];
      },
      staleTime,
    });
  }

  // Community prefetch - uses /comm route
  if (path.startsWith('/comm')) {
    // Global Community Events - uses shared queryFn with user-scoped key
    await queryClient.prefetchQuery({
      queryKey: eventsKey,
      queryFn: fetchCommunityEventsQueryFn,
      staleTime,
    });

    // Shorts - use stable EMPTY_SHORTS_PARAMS for exact cache key match
    await queryClient.prefetchQuery({
      queryKey: ['shorts', EMPTY_SHORTS_PARAMS],
      queryFn: async () => {
        const { data } = await supabase.from('media_videos').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(20);
        return data || [];
      },
      staleTime,
    });

    // Community Music - matches MediaHub.tsx queryFn exactly
    await queryClient.prefetchQuery({
      queryKey: ['community-music'],
      queryFn: async () => {
        const { data } = await supabase
          .from('media_uploads')
          .select(`
            id, title, description, tags, file_url, duration, plays_count, created_at,
            music_metadata (genre, mood, artist_name)
          `)
          .eq('media_type', 'music')
          .eq('status', 'approved')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10);
        return data || [];
      },
      staleTime,
    });

    // Community Podcasts - matches MediaHub.tsx queryFn exactly
    await queryClient.prefetchQuery({
      queryKey: ['community-podcasts'],
      queryFn: async () => {
        const { data } = await supabase
          .from('media_uploads')
          .select('*, podcast_metadata(*)')
          .eq('media_type', 'podcast')
          .eq('status', 'approved')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10);
        return data || [];
      },
      staleTime,
    });
  }

  if (path.startsWith('/discover')) {
    await queryClient.prefetchQuery({
      queryKey: eventsKey,
      queryFn: fetchCommunityEventsQueryFn,
      staleTime,
    });
  }

  // Find a Match — prefetch matches + board in parallel so the screen paints
  // from cache when the user navigates here from /home or /comm. Reuses the
  // exact same query functions FindPartner.tsx itself binds to (single source
  // of truth via intentApi). The query keys MUST match what FindPartner uses,
  // otherwise the screen will refetch and the prefetch is wasted.
  if (path === '/comm/find-partner') {
    const partnerStale = 5 * 60 * 1000;
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['find-partner-matches', userId],
        queryFn: () => getFindPartnerMatches(),
        staleTime: partnerStale,
      }),
      queryClient.prefetchQuery({
        queryKey: ['intent-board', 'find_a_partner'],
        queryFn: () =>
          getIntentBoard({
            surface: 'find_a_partner',
            categories: ['dance.*', 'fitness.*'],
            limit: 50,
          }),
        staleTime: partnerStale,
      }),
    ]);
  }

  // Inbox prefetch — restored after Phase 2 extraction of buildGlobalThreadsQueryFn.
  //
  // The historical regression (prefetchInboxThreads in src/lib/prefetchInboxThreads.ts)
  // used a hand-rolled, thinner fetch path that lacked the fetchDirectFromChatMessages
  // direct-DM fallback. On gateway cold-start it cached a [Vitana-bot-only] result that
  // the hook then read as "fresh" and refused to refetch, leaving the inbox empty until
  // manual refresh.
  //
  // The fix is structural: we call the SAME factory (buildGlobalThreadsQueryFn) the hook
  // itself uses, so prefetch and live fetch can never drift. The queryKey shape must
  // also match exactly (['global-threads', userId]) so the hook reads our prefetched
  // result on mount instead of refetching.
  if (path === '/inbox' && userId) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['global-threads', userId],
        queryFn: ({ queryKey: qk }) => buildGlobalThreadsQueryFn(userId, queryClient, qk),
        // 10min matches the hook's per-query staleTime; the hook treats the
        // prefetched data as fresh until then, paint-instant from cache.
        staleTime: 10 * 60 * 1000,
      }),
      // chat_groups rows (e.g. "FIRST 100") render in the same inbox list —
      // warm them too or the group section still pops in after the DMs.
      queryClient.prefetchQuery({
        queryKey: chatGroupsQueryKey(userId),
        queryFn: fetchGroups,
        staleTime: 2 * 60 * 1000,
      }),
    ]);

    // Warm the message HISTORY of the most recent conversations so opening
    // chat shows messages instantly instead of the "Loading messages" spinner.
    // Uses the same fetcher as the live hook (no drift) and the same 10min
    // staleTime, so the hook reads the prefetched result on mount. Capped at
    // 3 threads to keep the background cost proportional.
    const threads =
      queryClient.getQueryData<Array<{ id: string; updated_at: string }>>([
        'global-threads',
        userId,
      ]) ?? [];
    const recent = threads
      .filter((t) => !isChatGroupThreadId(t.id))
      .slice(0, 3);
    await Promise.all(
      recent.map((t) =>
        queryClient.prefetchQuery({
          queryKey: ['global-messages', t.id],
          queryFn: () => buildGlobalMessagesQueryFn(userId, t.id, queryClient),
          staleTime: 10 * 60 * 1000,
        }),
      ),
    );
  }
}
