import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { liveRoomService } from '@/services/liveRoomService';

export interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  stream_type: string;
  tags: string[];
  access_level: string;
  cover_image_url: string | null;
  co_hosts: string[];
  scheduled_for: string | null;
  status: 'pending' | 'live' | 'ended' | 'cancelled';
  enable_chat: boolean;
  enable_polls: boolean;
  enable_recording: boolean;
  recording_status?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  total_messages: number;
  metadata: any;
  creator_display_name?: string | null;
  creator_avatar_url?: string | null;
}

// Query keys + fetchers exported so the prefetch registry / post-login warmup
// reuse the EXACT same key+fetch the hooks bind to (single source of truth — a
// prefetched result the screen can read on mount instead of refetching).
export const SCHEDULED_STREAMS_KEY = ['live-streams', 'scheduled'] as const;
export const LIVE_STREAMS_KEY = ['live-streams', 'live'] as const;

// A stream is only flipped out of `status='live'` when the host explicitly ends
// it (gateway `/live/rooms/:id/end`). If the host just closes the app / loses
// connection, the row stays `live` forever and the UI keeps advertising it as
// "LIVE NOW" — even a day later. Guard against that: any stream that has been
// "live" longer than this window is treated as stale and excluded from the live
// listing. The backend reaper (pg_cron `fn_reap_stale_live_streams` in
// vitana-platform) flips these to `ended` at the source on the same threshold;
// this client-side check is belt-and-braces so the UI never shows a stale room
// even before the reaper runs or for rows it hasn't reached yet.
// NOTE: keep this value in sync with `p_max_hours` in the platform reaper.
export const MAX_LIVE_STREAM_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * True when a stream claims `status='live'` but has clearly been orphaned —
 * either it started longer ago than a real session would run, or it is "live"
 * with no start timestamp at all (which only happens for stuck rows).
 */
export function isLiveStreamStale(
  stream: Pick<LiveStream, 'status' | 'started_at' | 'created_at'>,
  now: number = Date.now(),
): boolean {
  if (stream.status !== 'live') return false;
  const startedRaw = stream.started_at ?? stream.created_at;
  const startedMs = startedRaw ? new Date(startedRaw).getTime() : NaN;
  // Live but no usable start timestamp → definitely orphaned.
  if (Number.isNaN(startedMs)) return true;
  return now - startedMs > MAX_LIVE_STREAM_DURATION_MS;
}

export async function fetchScheduledStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from('community_live_streams')
    .select('*')
    .eq('status', 'pending')
    .not('scheduled_for', 'is', null)
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true });

  if (error) throw error;

  return (data || []).map((stream: any) => ({
    ...stream,
    creator_display_name: null,
    creator_avatar_url: null,
    creator: undefined
  })) as LiveStream[];
}

export async function fetchLiveStreams(): Promise<LiveStream[]> {
  const { data, error } = await supabase
    .from('community_live_streams')
    .select('*')
    .eq('status', 'live')
    .order('started_at', { ascending: false });

  if (error) throw error;

  return (data || [])
    // Drop streams stuck in `live` from a past, never-ended session so the
    // listing (and the "LIVE NOW" card) never shows a room that ended long ago.
    .filter((stream) => !isLiveStreamStale(stream))
    .map((stream: any) => ({
      ...stream,
      creator_display_name: null,
      creator_avatar_url: null,
      creator: undefined
    })) as LiveStream[];
}

export function useScheduledStreams() {
  return useQuery({
    queryKey: SCHEDULED_STREAMS_KEY,
    queryFn: fetchScheduledStreams,
  });
}

export function useLiveStreams() {
  return useQuery({
    queryKey: LIVE_STREAMS_KEY,
    queryFn: fetchLiveStreams,
    refetchInterval: 30000,
  });
}

export function useCreateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamData: any) => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .insert([streamData])
        .select()
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useUpdateStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LiveStream> }) => {
      const { data, error } = await supabase
        .from('community_live_streams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useCancelStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .update({ status: 'cancelled' })
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useStartStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      // Prefer the gateway: POST /live/rooms/:id/start flips the stream to live AND
      // fans out "now live" notifications to everyone who tapped Notify
      // (live_stream_subscribers). Fall back to a direct status update if the stream
      // isn't backed by a gateway live_room or the gateway is unreachable — going
      // live must never be blocked (the fallback simply skips the broadcast).
      try {
        await liveRoomService.startRoom(streamId);
      } catch (gatewayErr) {
        console.warn('[useStartStream] gateway start failed, falling back to direct update:', gatewayErr);
        const { error } = await supabase
          .from('community_live_streams')
          .update({ status: 'live', started_at: new Date().toISOString() })
          .eq('id', streamId);
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from('community_live_streams')
        .select()
        .eq('id', streamId)
        .single();

      if (error) throw error;
      return data as LiveStream;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useEndStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}

export function useDeleteStream() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (streamId: string) => {
      const { error } = await supabase
        .from('community_live_streams')
        .delete()
        .eq('id', streamId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
  });
}
