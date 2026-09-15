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
  duration_minutes: number | null;
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
export const ENDED_STREAMS_KEY = ['live-streams', 'ended'] as const;

// The "Past" tab keeps EVERY ended session indefinitely — nothing is
// auto-expired — so a host's past rooms (and their recordings) stay saved
// until the host deletes them. The limit is only a query-safety cap for very
// large histories; raise it / add pagination if a tenant ever exceeds it.
const ENDED_STREAMS_LIMIT = 500;

export interface StreamRecording {
  id: string;
  stream_id: string;
  recording_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  status: string | null;
  created_at: string;
}

// An ended stream plus its recording (if one was captured and is ready).
export interface EndedStream extends LiveStream {
  recording: StreamRecording | null;
}

// A stream is only flipped out of `status='live'` when the host explicitly ends
// it (gateway `/live/rooms/:id/end`). If the host just closes the app / loses
// connection, the row stays `live` forever and the UI keeps advertising it as
// "LIVE NOW" — even a day later. A meetup now carries an explicit
// `duration_minutes` set at creation, so its deterministic finish time is
// start + duration; once past that it is treated as finished and excluded from
// the live listing. Legacy rows with no duration fall back to a fixed cap. The
// backend reaper (pg_cron `fn_reap_stale_live_streams` in vitana-platform)
// flips finished rooms to `ended` at the source on the same rule; this
// client-side check is belt-and-braces so the UI never shows a finished room
// even before the reaper runs or for rows it hasn't reached yet.
// NOTE: keep the fallback cap in sync with `p_max_hours` in the platform reaper.
export const MAX_LIVE_STREAM_DURATION_MS = 4 * 60 * 60 * 1000; // 4h fallback cap
// Small grace period past the planned end before we consider a room finished,
// so a meetup that runs a little long isn't yanked off-screen mid-session.
const LIVE_FINISH_GRACE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * True when a stream claims `status='live'` but is past its planned finish —
 * start (started_at, else scheduled_for) + duration + grace. Legacy rows with
 * no duration use a fixed cap; a row that is "live" with no usable start
 * timestamp at all (only happens for stuck rows) is always treated as finished.
 */
export function isLiveStreamStale(
  stream: Pick<LiveStream, 'status' | 'started_at' | 'scheduled_for' | 'created_at' | 'duration_minutes'>,
  now: number = Date.now(),
): boolean {
  if (stream.status !== 'live') return false;
  const startedRaw = stream.started_at ?? stream.scheduled_for ?? stream.created_at;
  const startedMs = startedRaw ? new Date(startedRaw).getTime() : NaN;
  // Live but no usable start timestamp → definitely orphaned.
  if (Number.isNaN(startedMs)) return true;
  const windowMs = stream.duration_minutes && stream.duration_minutes > 0
    ? stream.duration_minutes * 60 * 1000 + LIVE_FINISH_GRACE_MS
    : MAX_LIVE_STREAM_DURATION_MS;
  return now - startedMs > windowMs;
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

/**
 * Past tab: recently-ended rooms (status='ended') within the lookback window,
 * newest first, each hydrated with its recording (if one is ready). This is
 * where a finished meetup lands once the host ends it — or once the reaper /
 * staleness guard finishes it automatically.
 */
export async function fetchEndedStreams(): Promise<EndedStream[]> {
  const { data, error } = await supabase
    .from('community_live_streams')
    .select('*')
    .eq('status', 'ended')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .limit(ENDED_STREAMS_LIMIT);

  if (error) throw error;
  const streams = (data || []) as LiveStream[];
  if (streams.length === 0) return [];

  // Hydrate recordings in one query (ready recordings only).
  const ids = streams.map((s) => s.id);
  const { data: recordings, error: recordingsError } = await supabase
    .from('stream_recordings')
    .select('id, stream_id, recording_url, thumbnail_url, duration_seconds, file_size_bytes, status, created_at')
    .in('stream_id', ids)
    .eq('status', 'ready');

  if (recordingsError) {
    // Read/display path only — a failure here makes every ended stream's
    // recording invisible in the Past tab (indistinguishable from "never
    // recorded"), but the stream list itself already succeeded above, so we
    // log loudly and degrade rather than failing the whole query.
    console.error('[fetchEndedStreams] Failed to hydrate stream recordings:', recordingsError);
  }

  const recByStream = new Map<string, StreamRecording>();
  for (const r of (recordings || []) as StreamRecording[]) {
    // Keep the first ready recording per stream (most streams have one).
    if (!recByStream.has(r.stream_id)) recByStream.set(r.stream_id, r);
  }

  return streams.map((stream) => ({
    ...stream,
    creator_display_name: null,
    creator_avatar_url: null,
    creator: undefined,
    recording: recByStream.get(stream.id) ?? null,
  })) as EndedStream[];
}

export function useScheduledStreams() {
  return useQuery({
    queryKey: SCHEDULED_STREAMS_KEY,
    queryFn: fetchScheduledStreams,
  });
}

export function useEndedStreams(enabled: boolean = true) {
  return useQuery({
    queryKey: ENDED_STREAMS_KEY,
    queryFn: fetchEndedStreams,
    enabled,
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
