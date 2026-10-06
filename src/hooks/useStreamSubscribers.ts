/**
 * Who tapped "Notify me" on a scheduled Live Room (VTID-04912).
 *
 * Backed by the SECURITY DEFINER RPC `get_live_stream_subscribers`, which only
 * answers for signed-in members, only for pending/live rooms, and never lists
 * test or bot accounts. Loaded lazily — only while the list is open. Fails
 * soft: a not-yet-migrated environment shows an empty list, never a crash.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StreamSubscriber {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscribed_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any; // RPC not yet in generated Database types

export function useStreamSubscribers(streamId: string, enabled: boolean) {
  return useQuery<StreamSubscriber[]>({
    queryKey: ['stream-subscribers', streamId],
    enabled: enabled && !!streamId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_live_stream_subscribers', {
        p_stream_id: streamId,
        p_limit: 100,
      });
      if (error) {
        console.warn('[streamSubscribers] load failed:', error.message);
        return [];
      }
      return (data ?? []) as StreamSubscriber[];
    },
  });
}
