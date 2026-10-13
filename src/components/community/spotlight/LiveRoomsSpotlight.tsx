import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LiveRoom } from '@/components/liverooms/LiveRoomCard';
import { liveRoomToVCard } from '@/components/ui/vcard/adapters';
import { t } from '@/lib/i18n-toast';
import { FullRowGrid } from './FullRowGrid';
import { SocialVCard } from './SocialVCard';
import { RailHeading } from './SpotlightSection';
import { SpotlightEmptyCard, StageListSkeleton, type EmptySpec } from './SocialStates';

/**
 * VTID-05110 — Live Rooms on desktop Spotlight (`focus-feed`): the first room
 * of the active tab (live rooms come first) is the one `spotlight` card with
 * its Join / Remind-me action; the other rooms follow as a full-row grid. The
 * rail lists what is live now and what is coming up. Presentational: the page
 * keeps every handler (drawer, join, notify, edit, delete).
 */
export interface LiveRoomActions {
  onOpen: (roomId: string) => void;
  onJoin: (roomId: string) => void;
  onNotify: (roomId: string) => void;
  canEnter: (room: LiveRoom) => boolean;
  notifying: ReadonlySet<string>;
}

function LiveBadge() {
  return <Badge className="bg-destructive text-destructive-foreground">{t('spotlightSocial.common.live')}</Badge>;
}

function RoomAction({ room, actions }: { room: LiveRoom; actions: LiveRoomActions }) {
  if (actions.canEnter(room)) {
    return (
      <Button size="sm" onClick={() => actions.onJoin(room.id)}>
        {t('spotlightSocial.liveRooms.join')}
      </Button>
    );
  }
  if (!room.isLive) {
    const on = actions.notifying.has(room.id);
    return (
      <Button size="sm" variant={on ? 'secondary' : 'outline'} aria-pressed={on} onClick={() => actions.onNotify(room.id)}>
        {on ? t('spotlightSocial.liveRooms.notifyOn') : t('spotlightSocial.liveRooms.notify')}
      </Button>
    );
  }
  return null;
}

export function LiveRoomsStage({
  rooms,
  loading,
  empty,
  actions,
}: {
  rooms: LiveRoom[];
  loading: boolean;
  empty: EmptySpec;
  actions: LiveRoomActions;
}) {
  if (loading && rooms.length === 0) return <StageListSkeleton />;
  if (rooms.length === 0) return <SpotlightEmptyCard spec={empty} />;
  const [hero, ...rest] = rooms;
  return (
    <div className="flex flex-col gap-6">
      <SocialVCard
        data={liveRoomToVCard(hero)}
        size="spotlight"
        priority
        showBody
        onOpen={() => actions.onOpen(hero.id)}
        badge={hero.isLive ? <LiveBadge /> : undefined}
        actions={
          <>
            <RoomAction room={hero} actions={actions} />
            <Button size="sm" variant="ghost" onClick={() => actions.onOpen(hero.id)}>
              {t('spotlightSocial.common.details')}
            </Button>
          </>
        }
      />
      {rest.length > 0 && (
        <FullRowGrid
          items={rest}
          cols={2}
          renderItem={(room, size) => (
            <SocialVCard
              key={room.id}
              data={liveRoomToVCard(room)}
              size={size}
              onOpen={() => actions.onOpen(room.id)}
              badge={room.isLive ? <LiveBadge /> : undefined}
            />
          )}
        />
      )}
    </div>
  );
}

/** Rail: live now + coming up (pick them with `pickRailRooms`). Render it only when one list is non-empty. */
export function LiveRoomsRail({
  liveItems,
  nextItems,
  onOpen,
}: {
  liveItems: LiveRoom[];
  nextItems: LiveRoom[];
  onOpen: (roomId: string) => void;
}) {
  return (
    <>
      {liveItems.length > 0 && (
        <div className="flex flex-col gap-2" data-rail-block="live">
          <RailHeading>{t('spotlightSocial.liveRooms.liveNow')}</RailHeading>
          {liveItems.map((r) => (
            <SocialVCard key={r.id} data={liveRoomToVCard(r)} size="compact" onOpen={() => onOpen(r.id)} />
          ))}
        </div>
      )}
      {nextItems.length > 0 && (
        <div className="flex flex-col gap-2" data-rail-block="coming-up">
          <RailHeading>{t('spotlightSocial.liveRooms.comingUp')}</RailHeading>
          {nextItems.map((r) => (
            <SocialVCard key={r.id} data={liveRoomToVCard(r)} size="compact" onOpen={() => onOpen(r.id)} />
          ))}
        </div>
      )}
    </>
  );
}
