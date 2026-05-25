/**
 * Prefetch Registry - Central registry of query configurations for background prefetching
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_SHORTS_PARAMS } from '@/hooks/useShorts';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { getFindPartnerMatches, getIntentBoard } from '@/lib/intentApi';

/**
 * Map of adjacent pillars to prefetch when on a given route
 * Routes must match actual app routes (/comm not /community)
 */
export const ADJACENT_PILLARS: Record<string, string[]> = {
  '/home': ['/comm', '/discover', '/health', '/business', '/wallet', '/inbox', '/comm/find-partner'],
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

  // Inbox prefetch intentionally removed: prefetchInboxThreads used a thinner
  // fetch path than useGlobalMessages (no fetchDirectFromChatMessages fallback),
  // so on gateway cold-start it cached a [Vitana-bot-only] result that the hook
  // then read as "fresh" and refused to refetch, leaving the inbox empty until
  // a manual page refresh. The hook handles fetching on mount; chatPersistCache
  // provides instant paint on subsequent visits.
}
