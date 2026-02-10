/**
 * Fetch and cache list of live rooms
 * VTID-01230: Frontend integration for Daily.co Live Rooms
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LiveRoom } from '@/services/liveRoomService';

export function useLiveRoomList() {
  return useQuery({
    queryKey: ['live-rooms'],
    queryFn: async (): Promise<LiveRoom[]> => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LiveRoom[];
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useLiveRoomsByStatus(status: 'scheduled' | 'live' | 'ended') {
  return useQuery({
    queryKey: ['live-rooms', status],
    queryFn: async (): Promise<LiveRoom[]> => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LiveRoom[];
    },
    staleTime: 30 * 1000,
  });
}
