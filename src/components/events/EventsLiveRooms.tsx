/**
 * Live Rooms in the Events catalog (VTID-04907, plan LR-C 2).
 *
 * A Live Room is its own card type here, read from `community_live_streams`
 * through the same hooks the Live Rooms page uses (one source of truth — it is
 * never copied into `global_community_events`):
 *   - Hot: rooms live right now, most viewers first;
 *   - Today: live now first, then today's scheduled rooms by start time;
 *   - Upcoming: scheduled rooms from tomorrow on, by start time.
 * A live card opens the room (`/comm/live-rooms/<id>/view`); a scheduled card
 * opens the existing LiveRoomDrawer (Notify me, calendar, host: start).
 * Renders nothing when the tab has no rooms, so the events list and its empty
 * states are unchanged.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';
import { formatDate } from '@/lib/locale-format';
import { useAuth } from '@/context/AuthProvider';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfilesByIds } from '@/hooks/useProfiles';
import {
  useLiveStreams,
  useScheduledStreams,
  isScheduledStreamDue,
  type LiveStream,
} from '@/hooks/useLiveStreams';
import { LiveRoomDrawer } from '@/components/liverooms/LiveRoomDrawer';
import type { LiveRoom } from '@/components/liverooms/LiveRoomCard';

export type EventsLiveRoomsTab = 'hot' | 'today' | 'upcoming';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function matchesQuery(s: LiveStream, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    s.title?.toLowerCase().includes(q) ||
    !!s.description?.toLowerCase().includes(q) ||
    (s.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
  );
}

const byStart = (a: LiveStream, b: LiveStream) =>
  new Date(a.scheduled_for ?? 0).getTime() - new Date(b.scheduled_for ?? 0).getTime();

/** Which live rooms a given Events tab shows, in display order. Pure. */
export function selectLiveRoomsForTab(
  tab: EventsLiveRoomsTab,
  live: LiveStream[],
  scheduled: LiveStream[],
  searchQuery = '',
  now: Date = new Date(),
): LiveStream[] {
  const liveNow = live
    .filter((s) => s.status === 'live')
    .sort((a, b) => (b.viewer_count ?? 0) - (a.viewer_count ?? 0));
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pending = scheduled.filter((s) => s.status === 'pending' && s.scheduled_for);

  let rooms: LiveStream[];
  if (tab === 'hot') {
    rooms = liveNow;
  } else if (tab === 'today') {
    const todays = pending
      .filter((s) => {
        const at = new Date(s.scheduled_for!);
        return at >= today && at < tomorrow;
      })
      .sort(byStart);
    rooms = [...liveNow, ...todays];
  } else {
    rooms = pending.filter((s) => new Date(s.scheduled_for!) >= tomorrow).sort(byStart);
  }
  return rooms.filter((s) => matchesQuery(s, searchQuery));
}

function toRoom(stream: LiveStream, hostName: string, hostAvatar?: string): LiveRoom {
  return {
    id: stream.id,
    title: stream.title,
    description: stream.description || undefined,
    host: { id: stream.created_by, name: hostName, avatar: hostAvatar },
    isLive: stream.status === 'live',
    scheduledTime: stream.scheduled_for || undefined,
    startingSoon: isScheduledStreamDue(stream),
    startedAt: stream.started_at || undefined,
    durationMinutes: stream.duration_minutes ?? undefined,
    participants: stream.viewer_count ?? 0,
    tags: stream.tags ?? [],
    type: stream.stream_type === 'video' ? 'video' : 'audio',
    isPremium: stream.access_level === 'group',
    imageUrl: stream.cover_image_url || undefined,
    category: stream.tags?.[0] || 'general',
    location: t('screens.liverooms.virtual'),
    status: stream.status === 'live' ? 'live' : 'scheduled',
  };
}

interface EventsLiveRoomsProps {
  tab: EventsLiveRoomsTab;
  searchQuery?: string;
  className?: string;
}

export function EventsLiveRooms({ tab, searchQuery = '', className }: EventsLiveRoomsProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: liveStreams = [] } = useLiveStreams();
  const { data: scheduledStreams = [] } = useScheduledStreams();
  const [drawerRoomId, setDrawerRoomId] = useState<string | null>(null);

  const streams = useMemo(
    () => selectLiveRoomsForTab(tab, liveStreams, scheduledStreams, searchQuery),
    [tab, liveStreams, scheduledStreams, searchQuery],
  );

  const hostIds = useMemo(() => streams.map((s) => s.created_by).filter(Boolean), [streams]);
  const { data: profiles = [] } = useProfilesByIds(hostIds);
  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.user_id, p] as const)),
    [profiles],
  );

  const rooms = useMemo(
    () =>
      streams.map((s) => {
        const p = profilesById[s.created_by];
        const name =
          p?.display_name ||
          (s.created_by === user?.id ? t('screens.liverooms.you') : t('screens.liverooms.anonymousHost'));
        return toRoom(s, name, p?.avatar_url || undefined);
      }),
    [streams, profilesById, user?.id],
  );

  if (rooms.length === 0) return null;

  const openRoom = (room: LiveRoom) => {
    navigate(`/comm/live-rooms/${room.id}/view`, {
      state: {
        roomId: room.id,
        userId: user?.id,
        room,
      },
    });
  };

  const onCardClick = (room: LiveRoom) => {
    if (room.isLive) openRoom(room);
    else setDrawerRoomId(room.id);
  };

  const drawerRoom = rooms.find((r) => r.id === drawerRoomId) ?? null;

  return (
    <section
      data-testid="events-live-rooms"
      aria-label={t('screens.liveRoom.eventsSectionTitle')}
      className={cn('mb-4 min-w-0', isMobile ? 'px-0' : 'px-6', className)}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold mb-2 text-start">
        <Radio className="h-4 w-4 text-destructive" />
        {t('screens.liveRoom.eventsSectionTitle')}
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {rooms.map((room) => (
          <li key={room.id} className="snap-start shrink-0">
            <button
              type="button"
              data-testid="events-live-room-card"
              data-live={room.isLive ? 'true' : 'false'}
              onClick={() => onCardClick(room)}
              className="flex items-center gap-3 w-[260px] min-h-[72px] rounded-2xl border bg-card p-2 text-start shadow-sm transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-destructive/30">
                {room.imageUrl ? (
                  <img src={room.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <Radio className="absolute inset-0 m-auto h-6 w-6 text-foreground/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs">
                  {room.isLive ? (
                    <Badge className="bg-red-500 text-white border-0 px-1.5 py-0 text-[10px] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {t('screens.liverooms.live')}
                    </Badge>
                  ) : room.startingSoon ? (
                    <span className="font-medium text-primary">{t('screens.liveRoom.startingSoon')}</span>
                  ) : room.scheduledTime ? (
                    <span className="text-muted-foreground">
                      {formatDate(new Date(room.scheduledTime), 'EEE, d. MMM · HH:mm')}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm font-semibold">{room.title}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <span className="truncate">{room.host.name}</span>
                  {room.isLive && (
                    <span className="flex items-center gap-0.5 shrink-0" data-testid="events-live-room-viewers">
                      · <Users className="h-3 w-3" /> {t('screens.liveRoom.inRoomCount', { count: room.participants })}
                    </span>
                  )}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {drawerRoom && (
        <LiveRoomDrawer
          room={drawerRoom}
          open={!!drawerRoomId}
          onOpenChange={(open) => !open && setDrawerRoomId(null)}
          isMobile={isMobile}
          isCreator={drawerRoom.host.id === user?.id}
          onJoin={() => openRoom(drawerRoom)}
          onEdit={() => navigate(`/comm/live-rooms?live=${encodeURIComponent(drawerRoom.id)}`)}
          onDelete={() => navigate(`/comm/live-rooms?live=${encodeURIComponent(drawerRoom.id)}`)}
        />
      )}
    </section>
  );
}
