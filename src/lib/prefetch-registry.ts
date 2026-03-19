/**
 * Prefetch Registry - Central registry of query configurations for background prefetching
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_SHORTS_PARAMS } from '@/hooks/useShorts';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { prefetchInboxThreads } from '@/lib/prefetchInboxThreads';

/**
 * Map of adjacent pillars to prefetch when on a given route
 * Routes must match actual app routes (/comm not /community)
 */
export const ADJACENT_PILLARS: Record<string, string[]> = {
  '/home': ['/comm', '/discover', '/health', '/business', '/wallet', '/inbox'],
  '/comm': ['/home', '/discover', '/inbox'],
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

  // Inbox prefetch - re-enabled with proper queryFn that matches hook shape
  if (path.startsWith('/inbox') && userId) {
    await queryClient.prefetchQuery({
      queryKey: ['global-threads', userId],
      queryFn: () => prefetchInboxThreads(userId),
      staleTime: 0,
    });
  }
}
