/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — the live-room rules the native list
 * and viewer share. Re-implemented natively, not imported from core: the web rules live in
 * `src/hooks/useLiveStreams.ts` (`isLiveStreamStale`, `isScheduledStreamDue`, the grace windows)
 * and `src/pages/community/LiveRooms.tsx` (`transformStreamToRoom`, the search filter, the
 * all-tab time order). That module imports the web Supabase client, which is class B, so it can
 * not cross the `@vitana/core` bridge.
 */

/** A live room with no planned duration is treated as finished after this long (web `MAX_LIVE_STREAM_DURATION_MS`). */
export const MAX_LIVE_STREAM_DURATION_MS = 4 * 60 * 60 * 1000;
/** A scheduled room stays listed this long after its start while the host has not started it (web `SCHEDULED_GRACE_MS`). */
export const SCHEDULED_GRACE_MS = 2 * 60 * 60 * 1000;
const LIVE_FINISH_GRACE_MS = 15 * 60 * 1000;

export type StreamStatus = 'pending' | 'live' | 'ended' | 'cancelled';

/** A `community_live_streams` row, the columns the native list reads. */
export interface LiveStreamRow {
  id: string;
  title: string;
  description: string | null;
  stream_type: string;
  tags: string[] | null;
  access_level: string;
  cover_image_url: string | null;
  scheduled_for: string | null;
  status: StreamStatus;
  duration_minutes: number | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  viewer_count: number;
}

export interface RoomHost {
  id: string;
  name: string;
  avatar: string | null;
}

/** A room as the list and the drawer show it (web `LiveRoom`). */
export interface RoomView {
  id: string;
  title: string;
  description?: string;
  host: RoomHost;
  isLive: boolean;
  status?: 'live' | 'scheduled' | 'ended' | 'cancelled';
  scheduledTime?: string;
  /** A scheduled room whose start time has passed; the host can start it. */
  startingSoon?: boolean;
  startedAt?: string;
  durationMinutes?: number;
  participants: number;
  interestedCount: number;
  tags: string[];
  type: 'audio' | 'video';
  isPremium: boolean;
  imageUrl?: string;
  category: string;
  location: string;
}

type StaleInput = Pick<LiveStreamRow, 'status' | 'started_at' | 'scheduled_for' | 'created_at' | 'duration_minutes'>;

/**
 * True when a stream says `live` but is past its planned finish (start + duration + grace). A
 * live row with no usable start timestamp is always treated as finished.
 */
export function isLiveStreamStale(stream: StaleInput, now: number = Date.now()): boolean {
  if (stream.status !== 'live') return false;
  const startedRaw = stream.started_at ?? stream.scheduled_for ?? stream.created_at;
  const startedMs = startedRaw ? new Date(startedRaw).getTime() : Number.NaN;
  if (Number.isNaN(startedMs)) return true;
  const windowMs =
    stream.duration_minutes && stream.duration_minutes > 0
      ? stream.duration_minutes * 60 * 1000 + LIVE_FINISH_GRACE_MS
      : MAX_LIVE_STREAM_DURATION_MS;
  return now - startedMs > windowMs;
}

/** A pending room whose start time has passed: "starting soon". */
export function isScheduledStreamDue(stream: Pick<LiveStreamRow, 'status' | 'scheduled_for'>, now: number = Date.now()): boolean {
  if (stream.status !== 'pending' || !stream.scheduled_for) return false;
  const at = new Date(stream.scheduled_for).getTime();
  return !Number.isNaN(at) && at <= now;
}

/** The web list's room shape for one stream. `host.name` comes from the caller (profile, "you", or anonymous). */
export function streamToRoom(
  stream: LiveStreamRow,
  host: { name: string; avatar: string | null },
  extras: { interestedCount: number },
  now: number = Date.now(),
): RoomView {
  const isLive = stream.status === 'live';
  return {
    id: stream.id,
    title: stream.title,
    description: stream.description || undefined,
    host: { id: stream.created_by, name: host.name, avatar: host.avatar },
    isLive,
    status: isLive ? 'live' : 'scheduled',
    scheduledTime: stream.scheduled_for || undefined,
    startingSoon: isScheduledStreamDue(stream, now),
    startedAt: stream.started_at || undefined,
    durationMinutes: stream.duration_minutes ?? undefined,
    participants: stream.viewer_count ?? 0,
    interestedCount: extras.interestedCount,
    tags: stream.tags ?? [],
    type: stream.stream_type === 'video' ? 'video' : 'audio',
    isPremium: stream.access_level === 'group',
    imageUrl: stream.cover_image_url || undefined,
    category: stream.tags?.[0] || 'general',
    location: 'Virtual',
  };
}

/** Free-text filter over title, description, host name, tags and category. A blank query keeps everything. */
export function filterRooms(rooms: RoomView[], query: string): RoomView[] {
  const q = query.trim().toLowerCase();
  if (!q) return rooms;
  return rooms.filter(
    (room) =>
      room.title.toLowerCase().includes(q) ||
      (room.description?.toLowerCase().includes(q) ?? false) ||
      room.host.name.toLowerCase().includes(q) ||
      room.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      room.category.toLowerCase().includes(q),
  );
}

/** The all tab: live and scheduled rooms in one list, ordered by time. Undated (live) rooms come first. */
export function allRoomsInTimeOrder(live: RoomView[], scheduled: RoomView[]): RoomView[] {
  const timeOf = (room: RoomView) => {
    const ts = room.scheduledTime ? new Date(room.scheduledTime).getTime() : Number.NaN;
    return Number.isNaN(ts) ? 0 : ts;
  };
  return [...live, ...scheduled].sort((a, b) => timeOf(a) - timeOf(b));
}

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop',
];

/** The web cover fallback: the same image for the same title (a hash of the title). */
export function fallbackRoomImage(title: string): string {
  const hash = title.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return ROOM_IMAGES[Math.abs(hash) % ROOM_IMAGES.length];
}
