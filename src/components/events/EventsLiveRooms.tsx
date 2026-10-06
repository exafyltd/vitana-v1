/**
 * Live Rooms in the Events catalog (VTID-04907).
 *
 * A Live Room is shown as a normal, full event card in the same list as every
 * other event (owner decision 2026-10-06: no separate "Live-Räume" strip), with
 * a red LIVE badge. Rooms are read from `community_live_streams` through the
 * same hooks the Live Rooms page uses (one source of truth — never copied into
 * `global_community_events`) and turned into CommunityEvent-shaped items with
 * `event_type: 'live_room'`, so Hot / Today / Upcoming / search treat them like
 * any other event.
 *
 * A live card opens the room (`/comm/live-rooms/<id>/view`); a scheduled card
 * opens the existing LiveRoomDrawer (Notify me, calendar, host: start). The
 * event drawer, RSVP button and edit/delete menu are never used for a room.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/lib/i18n-toast';
import { useAuth } from '@/context/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfilesByIds } from '@/hooks/useProfiles';
import {
  useLiveStreams,
  useScheduledStreams,
  isScheduledStreamDue,
  type LiveStream,
} from '@/hooks/useLiveStreams';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { LiveRoomDrawer } from '@/components/liverooms/LiveRoomDrawer';
import type { LiveRoom } from '@/components/liverooms/LiveRoomCard';

export const LIVE_ROOM_EVENT_TYPE = 'live_room';

const DEFAULT_DURATION_MIN = 60;

export interface LiveRoomEventMeta {
  live_room: true;
  /** The room is live right now. */
  is_live: boolean;
  /** Scheduled and its start time has passed, host has not started yet. */
  is_due: boolean;
  stream: LiveStream;
}

export function isLiveRoomEvent(e: { event_type?: string | null } | null | undefined): boolean {
  return e?.event_type === LIVE_ROOM_EVENT_TYPE;
}

/** Live now, or due (start passed, waiting for the host) — belongs in "now". */
export function isOngoingLiveRoom(e: { event_type?: string | null; metadata?: { is_live?: boolean; is_due?: boolean } | null }): boolean {
  return isLiveRoomEvent(e) && (e.metadata?.is_live === true || e.metadata?.is_due === true);
}

/** A room as an Events-catalog item. Pure. */
export function liveStreamToEvent(
  stream: LiveStream,
  host: { name: string; avatar?: string | null },
  now: number = Date.now(),
): CommunityEvent {
  const isLive = stream.status === 'live';
  const start = (isLive ? stream.started_at : null) || stream.scheduled_for || stream.started_at || stream.created_at;
  const startMs = new Date(start).getTime();
  const end = Number.isNaN(startMs)
    ? null
    : new Date(startMs + (stream.duration_minutes || DEFAULT_DURATION_MIN) * 60_000).toISOString();
  const meta: LiveRoomEventMeta = {
    live_room: true,
    is_live: isLive,
    is_due: isScheduledStreamDue(stream, now),
    stream,
  };
  return {
    id: stream.id,
    slug: null,
    title: stream.title,
    description: stream.description,
    event_type: LIVE_ROOM_EVENT_TYPE,
    location: t('screens.liverooms.virtual'),
    virtual_link: null,
    start_time: start,
    end_time: end,
    max_participants: null,
    participant_count: stream.viewer_count ?? 0,
    created_by: stream.created_by,
    created_at: stream.created_at,
    updated_at: stream.created_at,
    image_url: stream.cover_image_url || host.avatar || undefined,
    metadata: meta,
    creator_display_name: host.name,
    creator_avatar_url: host.avatar || undefined,
  };
}

/** Every live and scheduled room, as Events-catalog items. */
export function useLiveRoomEvents(): CommunityEvent[] {
  const { user } = useAuth();
  const { data: liveStreams = [] } = useLiveStreams();
  const { data: scheduledStreams = [] } = useScheduledStreams();

  const streams = useMemo(() => {
    const byId = new Map<string, LiveStream>();
    for (const s of scheduledStreams) if (s.status === 'pending' && s.scheduled_for) byId.set(s.id, s);
    for (const s of liveStreams) if (s.status === 'live') byId.set(s.id, s);
    return [...byId.values()];
  }, [liveStreams, scheduledStreams]);

  const hostIds = useMemo(() => [...new Set(streams.map((s) => s.created_by).filter(Boolean))], [streams]);
  const { data: profiles = [] } = useProfilesByIds(hostIds);

  return useMemo(() => {
    const byUser = new Map(profiles.map((p) => [p.user_id, p] as const));
    const now = Date.now();
    return streams.map((s) => {
      const p = byUser.get(s.created_by);
      const name =
        p?.display_name ||
        s.creator_display_name ||
        (s.created_by === user?.id ? t('screens.liverooms.you') : t('screens.liverooms.anonymousHost'));
      return liveStreamToEvent(s, { name, avatar: p?.avatar_url || s.creator_avatar_url }, now);
    });
  }, [streams, profiles, user?.id]);
}

/** The LiveRoomDrawer's view of a room item. */
export function liveRoomEventToRoom(e: CommunityEvent): LiveRoom {
  const meta = e.metadata as LiveRoomEventMeta;
  const s = meta.stream;
  return {
    id: s.id,
    title: s.title,
    description: s.description || undefined,
    host: { id: s.created_by, name: e.creator_display_name || '', avatar: e.creator_avatar_url },
    isLive: meta.is_live,
    scheduledTime: s.scheduled_for || undefined,
    startingSoon: meta.is_due,
    startedAt: s.started_at || undefined,
    durationMinutes: s.duration_minutes ?? undefined,
    participants: s.viewer_count ?? 0,
    tags: s.tags ?? [],
    type: s.stream_type === 'video' ? 'video' : 'audio',
    isPremium: s.access_level === 'group',
    imageUrl: s.cover_image_url || undefined,
    category: s.tags?.[0] || 'general',
    location: t('screens.liverooms.virtual'),
    status: meta.is_live ? 'live' : 'scheduled',
  };
}

/** Where a tap on a room card goes: live → the room; scheduled → its drawer. */
export function useOpenLiveRoom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (e: CommunityEvent) => {
    const room = liveRoomEventToRoom(e);
    navigate(`/comm/live-rooms/${room.id}/view`, { state: { roomId: room.id, userId: user?.id, room } });
  };
}

interface LiveRoomEventDrawerProps {
  event: CommunityEvent | null;
  onClose: () => void;
}

export function LiveRoomEventDrawer({ event, onClose }: LiveRoomEventDrawerProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const openRoom = useOpenLiveRoom();
  if (!event || !isLiveRoomEvent(event)) return null;
  const room = liveRoomEventToRoom(event);
  const manage = () => navigate(`/comm/live-rooms?live=${encodeURIComponent(room.id)}`);
  return (
    <LiveRoomDrawer
      room={room}
      open
      onOpenChange={(open) => !open && onClose()}
      isMobile={isMobile}
      isCreator={room.host.id === user?.id}
      onJoin={() => openRoom(event)}
      onEdit={manage}
      onDelete={manage}
    />
  );
}

/**
 * NewsCard props a room card overrides on top of the normal event card: red
 * LIVE badge, viewer count, and none of the event-only parts (RSVP button —
 * it would write a `global_event_participants` row for a room id —, price,
 * tickets, share, edit/delete menu).
 */
export function liveRoomCardOverrides(e: CommunityEvent) {
  const meta = e.metadata as LiveRoomEventMeta;
  return {
    pillar: t('screens.liverooms.live'),
    pillarVariant: (meta.is_live ? 'live-now' : 'live') as 'live-now' | 'live',
    ...(meta.is_due && !meta.is_live ? { timestamp: t('screens.liveRoom.startingSoon') } : {}),
    attendees: e.participant_count || 0,
    price: undefined,
    eventId: undefined,
    eventType: LIVE_ROOM_EVENT_TYPE,
    showSmartAction: false,
    hasTickets: false,
    isPaidEvent: false,
    onBuyTicket: undefined,
    utilityTopRight: undefined,
    actionButton: undefined,
    'data-live-room': meta.is_live ? 'live' : 'scheduled',
  };
}
