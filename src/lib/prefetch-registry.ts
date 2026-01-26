/**
 * Prefetch Registry - Central registry of query configurations for background prefetching
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_SHORTS_PARAMS } from '@/hooks/useShorts';
import { fetchCommunityEventsQueryFn } from '@/hooks/useCommunityEvents';
import { fetchOrganizerEventsQueryFn } from '@/hooks/useOrganizerEvents';

/**
 * Map of adjacent pillars to prefetch when on a given route
 * Routes must match actual app routes (/comm not /community)
 * Updated for Appilix mobile PWA screens
 */
export const ADJACENT_PILLARS: Record<string, string[]> = {
  '/home': ['/comm', '/discover', '/health', '/business', '/wallet', '/inbox'],
  '/comm': ['/home', '/discover', '/inbox'],
  '/comm/events-meetups': ['/business', '/comm/live-rooms', '/me/profile'],
  '/comm/live-rooms': ['/comm/events-meetups', '/comm/media-hub', '/me/profile'],
  '/comm/media-hub': ['/comm/events-meetups', '/comm/live-rooms'],
  '/discover': ['/home', '/comm', '/calendar', '/wallet'],
  '/discover/orders': ['/discover', '/wallet'],
  '/health': ['/home', '/calendar', '/discover'],
  '/business': ['/comm/events-meetups', '/wallet', '/me/profile'],
  '/wallet': ['/home', '/business', '/discover'],
  '/calendar': ['/home', '/health'],
  '/inbox': ['/home', '/comm'],
  '/me/profile': ['/wallet', '/settings', '/comm/events-meetups'],
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

  // Business Hub prefetch
  if (path.startsWith('/business')) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['business-packages', userId, tenantId],
        queryFn: async () => {
          if (!tenantId) return [];
          const { data } = await supabase.from('business_packages').select('*').eq('creator_id', userId).eq('tenant_id', tenantId).limit(20);
          return data || [];
        },
        staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: ['organizer-events', userId],
        queryFn: () => fetchOrganizerEventsQueryFn(userId),
        staleTime,
      }),
    ]);
  }

  // Health prefetch
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

  // Wallet prefetch
  if (path.startsWith('/wallet')) {
    await queryClient.prefetchQuery({
      queryKey: ['wallet-balances', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('user_wallets')
          .select('currency_type, balance, updated_at')
          .eq('user_id', userId);
        return data || [];
      },
      staleTime,
    });
  }

  // Profile prefetch
  if (path.startsWith('/me/profile')) {
    await queryClient.prefetchQuery({
      queryKey: ['profiles', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        return data;
      },
      staleTime,
    });
  }

  // Community prefetch - uses /comm route
  if (path.startsWith('/comm')) {
    // Global Community Events - uses shared queryFn for exact cache match
    await queryClient.prefetchQuery({
      queryKey: ['global-community-events'],
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

    // Live Streams prefetch for /comm/live-rooms
    if (path.startsWith('/comm/live-rooms')) {
      await queryClient.prefetchQuery({
        queryKey: ['live-streams'],
        queryFn: async () => {
          const { data } = await supabase
            .from('community_live_streams')
            .select('*')
            .eq('status', 'live')
            .order('started_at', { ascending: false })
            .limit(20);
          return data || [];
        },
        staleTime,
      });
    }
  }

  if (path.startsWith('/discover')) {
    await queryClient.prefetchQuery({
      queryKey: ['global-community-events'],
      queryFn: fetchCommunityEventsQueryFn,
      staleTime,
    });
  }

  // Inbox prefetch - DISABLED temporarily to prevent partial data causing UI flickers
  // The thread hooks fetch detailed data (participants, last_message, unread_count)
  // but prefetch was only fetching basic thread data, causing cache mismatch
  // TODO: Re-enable when prefetch matches exact hook queryFn shape
  // if (path.startsWith('/inbox')) {
  //   // Prefetching disabled - let the hooks handle initial fetch for data consistency
  // }
}
