/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — native twin of the web live-room data
 * hooks (`src/hooks/useLiveStreams.ts`, `useStreamSubscription.ts`, `useStreamSubscribers.ts`,
 * `useProfiles.ts`, and the host and recording reads of `LiveRoomViewer.tsx`). The same PostgREST
 * tables, columns, filters and RPC names, re-implemented against the native Supabase client. The
 * profile read is the web's own `profiles` query, so the test-account exclusions it carries apply.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { isLiveStreamStale, SCHEDULED_GRACE_MS, type LiveStreamRow } from './rules';
import { fetchRoomState } from './gateway';

/** The chainable query surface the live-room reads and writes use. Only the methods below are called. */
type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null };
interface DbQuery<T> extends PromiseLike<DbResult<T>> {
  select(columns: string): DbQuery<T>;
  eq(column: string, value: unknown): DbQuery<T>;
  in(column: string, values: unknown[]): DbQuery<T>;
  gte(column: string, value: unknown): DbQuery<T>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): DbQuery<T>;
  limit(count: number): DbQuery<T>;
  insert(values: Record<string, unknown>): DbQuery<T>;
  delete(): DbQuery<T>;
  maybeSingle(): PromiseLike<DbResult<T>>;
}
interface DbClient {
  from<T = unknown>(table: string): DbQuery<T>;
  rpc<T = unknown>(name: string, args?: Record<string, unknown>): PromiseLike<DbResult<T>>;
}

const db = (): DbClient => getSupabase() as unknown as DbClient;

export const LIVE_STREAMS_KEY = ['live-streams', 'live'] as const;
export const SCHEDULED_STREAMS_KEY = ['live-streams', 'scheduled'] as const;
export const ENDED_STREAMS_KEY = ['live-streams', 'ended'] as const;
const MINE_KEY = ['stream-subscriptions', 'mine'] as const;
const COUNTS_KEY = ['stream-subscriptions', 'counts'] as const;

/** The Past tab keeps every ended session; the limit is only a query-safety cap (web `ENDED_STREAMS_LIMIT`). */
const ENDED_STREAMS_LIMIT = 500;

export interface StreamRecording {
  id: string;
  stream_id: string;
  recording_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: string | null;
  created_at: string;
}

export interface EndedRoomRow extends LiveStreamRow {
  ended_at: string | null;
  recording: StreamRecording | null;
}

export interface RoomProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface StreamSubscriber {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscribed_at: string;
}

const isMissingRelation = (error: { code?: string; message: string }) =>
  error.code === 'PGRST205' || error.code === '42P01' || /schema cache|find the table|does not exist/i.test(error.message);

/** Live rooms that are not stale (a room stuck in `live` from a past session is dropped). */
export async function fetchLiveStreams(now: number = Date.now()): Promise<LiveStreamRow[]> {
  const { data, error } = await db()
    .from<LiveStreamRow[]>('community_live_streams')
    .select('*')
    .eq('status', 'live')
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((stream) => !isLiveStreamStale(stream, now));
}

/** Scheduled rooms still listed (pending, start within the grace window), soonest first. */
export async function fetchScheduledStreams(now: number = Date.now()): Promise<LiveStreamRow[]> {
  const since = new Date(now - SCHEDULED_GRACE_MS).toISOString();
  const { data, error } = await db()
    .from<LiveStreamRow[]>('community_live_streams')
    .select('*')
    .eq('status', 'pending')
    .gte('scheduled_for', since)
    .order('scheduled_for', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).filter((stream) => stream.scheduled_for !== null);
}

/** Ended rooms, newest first, each with its ready recording when one exists. */
export async function fetchEndedStreams(): Promise<EndedRoomRow[]> {
  const { data, error } = await db()
    .from<EndedRoomRow[]>('community_live_streams')
    .select('*')
    .eq('status', 'ended')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .limit(ENDED_STREAMS_LIMIT);
  if (error) throw new Error(error.message);
  const streams = data ?? [];
  if (streams.length === 0) return [];

  const { data: recordings, error: recordingsError } = await db()
    .from<StreamRecording[]>('stream_recordings')
    .select('id, stream_id, recording_url, thumbnail_url, duration_seconds, status, created_at')
    .in(
      'stream_id',
      streams.map((s) => s.id),
    )
    .eq('status', 'ready');
  if (recordingsError) console.error('[liveRooms] recordings lookup failed:', recordingsError.message);

  const byStream = new Map<string, StreamRecording>();
  for (const r of recordingsError ? [] : (recordings ?? [])) if (!byStream.has(r.stream_id)) byStream.set(r.stream_id, r);
  return streams.map((stream) => ({ ...stream, recording: byStream.get(stream.id) ?? null }));
}

export async function fetchRoomProfiles(userIds: string[]): Promise<RoomProfile[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await db()
    .from<RoomProfile[]>('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', userIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Stream ids the member tapped "Notify me" on. Fails soft to an empty set (a not-yet-migrated table never breaks the list). */
export async function fetchMySubscriptions(userId: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from<Array<{ stream_id: string }>>('live_stream_subscribers')
    .select('stream_id')
    .eq('user_id', userId);
  if (error) {
    console.warn('[liveRooms] subscriptions load failed:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.stream_id));
}

/** "X will join" counts keyed by stream id. Fails soft to no counts. */
export async function fetchSubscriberCounts(streamIds: string[]): Promise<Record<string, number>> {
  if (streamIds.length === 0) return {};
  const { data, error } = await db().rpc<Array<{ stream_id: string; subscriber_count: number }>>('get_live_stream_subscriber_counts', {
    stream_ids: streamIds,
  });
  if (error) {
    console.warn('[liveRooms] subscriber counts failed:', error.message);
    return {};
  }
  const out: Record<string, number> = {};
  for (const row of data ?? []) out[row.stream_id] = Number(row.subscriber_count);
  return out;
}

/** Who tapped "Notify me" on a room, for the drawer's faces row. Fails soft to an empty list. */
export async function fetchStreamSubscribers(streamId: string): Promise<StreamSubscriber[]> {
  const { data, error } = await db().rpc<StreamSubscriber[]>('get_live_stream_subscribers', { p_stream_id: streamId, p_limit: 100 });
  if (error) {
    console.warn('[liveRooms] subscribers load failed:', error.message);
    return [];
  }
  return data ?? [];
}

/** Writes the member's "Notify me" row. A duplicate counts as success; a missing table fails soft. */
export async function subscribeToRoom(userId: string, streamId: string): Promise<void> {
  const { error } = await db().from('live_stream_subscribers').insert({ stream_id: streamId, user_id: userId });
  if (!error || error.code === '23505') return;
  if (isMissingRelation(error)) return;
  throw new Error(error.message);
}

export async function unsubscribeFromRoom(userId: string, streamId: string): Promise<void> {
  const { error } = await db().from('live_stream_subscribers').delete().eq('stream_id', streamId).eq('user_id', userId);
  if (!error || isMissingRelation(error)) return;
  throw new Error(error.message);
}

/** The room's host id from `live_rooms`, for host detection. A failed read is logged and reads as no host. */
export async function fetchRoomHostId(roomId: string): Promise<string | null> {
  const { data, error } = await db()
    .from<{ host_user_id: string }>('live_rooms')
    .select('host_user_id, metadata')
    .eq('id', roomId)
    .maybeSingle();
  if (error) {
    console.error('[liveRooms] host detection query failed:', error.message);
    return null;
  }
  return (data as { host_user_id?: string } | null)?.host_user_id ?? null;
}

/** The ready recording of an ended room, for the replay link. */
export async function fetchReadyRecording(roomId: string): Promise<StreamRecording | null> {
  const { data, error } = await db()
    .from<StreamRecording>('stream_recordings')
    .select('*')
    .eq('stream_id', roomId)
    .eq('status', 'ready')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StreamRecording | null) ?? null;
}

export function useLiveStreams() {
  return useQuery({ queryKey: LIVE_STREAMS_KEY, queryFn: () => fetchLiveStreams(), staleTime: 30_000 });
}

export function useScheduledStreams() {
  return useQuery({ queryKey: SCHEDULED_STREAMS_KEY, queryFn: () => fetchScheduledStreams(), staleTime: 30_000 });
}

export function useEndedStreams(enabled: boolean) {
  return useQuery({ queryKey: ENDED_STREAMS_KEY, queryFn: fetchEndedStreams, enabled, staleTime: 30_000 });
}

export function useRoomProfiles(userIds: string[]) {
  const ids = [...new Set(userIds)].filter(Boolean).sort();
  return useQuery({
    queryKey: ['profiles', ids.join(',')],
    queryFn: () => fetchRoomProfiles(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

export function useMyRoomSubscriptions(userId: string | undefined) {
  return useQuery({
    queryKey: [...MINE_KEY, userId ?? null],
    queryFn: () => fetchMySubscriptions(userId as string),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useRoomSubscriberCounts(streamIds: string[]) {
  const ids = [...streamIds].sort();
  return useQuery({
    queryKey: [...COUNTS_KEY, ids.join(',')],
    queryFn: () => fetchSubscriberCounts(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });
}

export function useRoomSubscribers(streamId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['stream-subscribers', streamId],
    queryFn: () => fetchStreamSubscribers(streamId),
    enabled: enabled && !!streamId,
    staleTime: 15_000,
  });
}

/** Toggles "Notify me" for the signed-in member and refreshes the lists that show it. */
export function useToggleRoomNotify(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ streamId, on }: { streamId: string; on: boolean }) => {
      if (!userId) throw new Error('Not signed in');
      if (on) await unsubscribeFromRoom(userId, streamId);
      else await subscribeToRoom(userId, streamId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: MINE_KEY });
      void queryClient.invalidateQueries({ queryKey: COUNTS_KEY });
    },
  });
}

/** Room state for the viewer. Polls every 5 s while the room is live or in its lobby (web `useRoomState`). */
export function useRoomState(roomId: string) {
  return useQuery({
    queryKey: ['room-state', roomId],
    queryFn: () => fetchRoomState(roomId),
    enabled: !!roomId,
    refetchInterval: (query) => {
      const status = query.state.data?.room?.status;
      return status === 'live' || status === 'lobby' ? 5_000 : false;
    },
    staleTime: 3_000,
  });
}

export function useRoomHostId(roomId: string, enabled: boolean) {
  return useQuery({ queryKey: ['live-room-host', roomId], queryFn: () => fetchRoomHostId(roomId), enabled: enabled && !!roomId, staleTime: 60_000 });
}

export function useReadyRecording(roomId: string, enabled: boolean) {
  return useQuery({ queryKey: ['stream-recording', roomId], queryFn: () => fetchReadyRecording(roomId), enabled: enabled && !!roomId });
}
