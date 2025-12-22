/**
 * Prefetch Registry - Central registry of query configurations for background prefetching
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EMPTY_SHORTS_PARAMS } from '@/hooks/useShorts';

/**
 * Map of adjacent pillars to prefetch when on a given route
 * Routes must match actual app routes (/comm not /community)
 */
export const ADJACENT_PILLARS: Record<string, string[]> = {
  '/home': ['/comm', '/discover', '/health', '/business', '/wallet'],
  '/comm': ['/home', '/discover'],
  '/discover': ['/home', '/comm', '/calendar'],
  '/health': ['/home', '/calendar'],
  '/business': ['/home', '/wallet'],
  '/wallet': ['/home', '/business'],
  '/calendar': ['/home', '/health'],
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
    // Shorts - use stable EMPTY_SHORTS_PARAMS for exact cache key match
    await queryClient.prefetchQuery({
      queryKey: ['shorts', EMPTY_SHORTS_PARAMS],
      queryFn: async () => {
        const { data } = await supabase.from('media_videos').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(20);
        return data || [];
      },
      staleTime,
    });
  }

  if (path.startsWith('/discover')) {
    await queryClient.prefetchQuery({
      queryKey: ['global-community-events'],
      queryFn: async () => {
        const { data } = await supabase.from('global_community_events').select('*').gte('start_time', new Date().toISOString()).limit(20);
        return data || [];
      },
      staleTime,
    });
  }
}
