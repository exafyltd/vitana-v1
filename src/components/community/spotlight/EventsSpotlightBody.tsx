import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArchetypeSkeleton, SpotlightGrid } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { eventToVCard, memberToVCard, type VCardData } from '@/components/ui/vcard/adapters';
import type { MemberLike } from '@/components/ui/vcard/adapters/member';
import { isLiveRoomEvent, isOngoingLiveRoom } from '@/components/events/EventsLiveRooms';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { useEventParticipation } from '@/hooks/useEventParticipation';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { SocialVCard } from './SocialVCard';
import { SocialEmpty, type EmptySpec } from './SocialStates';
/**
 * VTID-05110 — Events & Meetups on desktop Spotlight.
 *
 * VTID-05417 — contract SR-31 Spotlight grid (owner-approved layout,
 * 2026-10-31): the next event of the active tab is the one labelled
 * `spotlight` card (~40% wide, Details + Join), the next six sit beside it as
 * `standard` tiles ("This week"), the rest are the compact "Upcoming" row, and
 * Live now / You follow are compact rows in a section below (D8) instead of a
 * nested rail.
 *
 * Presentational only: the page keeps every handler (drawer, deep links,
 * search, create) and passes them in. Join reuses the existing RSVP path: a
 * free event toggles `useEventParticipation` (the hook the event cards use);
 * a paid / ticketed event or a live room goes through the page handler
 * (drawer / room), exactly like the event cards' ticket CTA — no new write.
 */
export interface EventsSpotlightBodyProps {
  events: CommunityEvent[];
  loading: boolean;
  liveNow: CommunityEvent[];
  followed?: MemberLike[];
  onOpen: (event: CommunityEvent) => void;
  empty: EmptySpec;
}
const TILES = 6;
const STRETCH = 'text-start after:absolute after:inset-0 focus-visible:outline-none';
function LiveBadge() {
  return <Badge className="bg-destructive text-destructive-foreground">{t('spotlightSocial.common.live')}</Badge>;
}
/** Free event: the existing RSVP toggle. Already going → no Join (Leave stays in the drawer). */
function RsvpJoin({ event }: { event: CommunityEvent }) {
  const participation = useEventParticipation(event.id, event.participant_count || 0);
  if (participation.isParticipating) return null;
  return (
    <Button size="sm" disabled={participation.loading || participation.checking} onClick={() => void participation.toggleParticipation()}>
      {t('spotlight.grid.events.join')}
    </Button>
  );
}
function JoinAction({ event, onOpen }: { event: CommunityEvent; onOpen: (event: CommunityEvent) => void }) {
  const viaPage = isLiveRoomEvent(event) || event.metadata?.has_tickets === true || event.metadata?.is_paid === true;
  if (!viaPage) return <RsvpJoin event={event} />;
  return (
    <Button size="sm" onClick={() => onOpen(event)}>
      {t('spotlight.grid.events.join')}
    </Button>
  );
}
function FeaturedCard({ event, onOpen }: { event: CommunityEvent; onOpen: (event: CommunityEvent) => void }) {
  const data: VCardData = eventToVCard(event);
  const featured = t('spotlight.grid.events.featured');
  return (
    <VCard
      size="spotlight"
      spotlightLabel
      priority
      media={data.media}
      eyebrow={data.eyebrow ? `${featured} · ${data.eyebrow}` : featured}
      title={
        <button type="button" className={STRETCH} onClick={() => onOpen(event)}>
          {data.title}
        </button>
      }
      meta={data.meta}
      body={data.body ? <span className="line-clamp-3">{data.body}</span> : undefined}
      badge={isOngoingLiveRoom(event) ? <LiveBadge /> : undefined}
      actions={
        <span className="relative z-10 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpen(event)}>
            {t('spotlightSocial.common.details')}
          </Button>
          <JoinAction event={event} onOpen={onOpen} />
          {event.participant_count > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('spotlightSocial.events.going', { count: fmtNumber(event.participant_count) })}
            </span>
          )}
        </span>
      }
      data-vcard-key={data.key}
      className="relative h-full focus-within:ring-2 focus-within:ring-ring"
    />
  );
}
function CompactBlock({ block, title, children }: { block: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3" data-rail-block={block}>
      <h2 className="text-base font-bold leading-snug">{title}</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
    </div>
  );
}
export function EventsSpotlightBody({ events, loading, liveNow, followed = [], onOpen, empty }: EventsSpotlightBodyProps) {
  if (loading && events.length === 0) return <ArchetypeSkeleton archetype="collection" layout="spotlight-grid" />;
  const [featured, ...more] = events;
  if (!featured) return <SocialEmpty spec={empty} />;
  const thisWeek = more.slice(0, TILES);
  const upcoming = more.slice(TILES);
  const liveItems = liveNow.filter((e) => e.id !== featured.id).slice(0, 4);
  const followedItems = followed.slice(0, 6);
  const eventCard = (e: CommunityEvent, size: 'standard' | 'compact') => (
    <SocialVCard
      key={e.id}
      data={eventToVCard(e)}
      size={size}
      onOpen={() => onOpen(e)}
      badge={isOngoingLiveRoom(e) ? <LiveBadge /> : undefined}
      className="h-full"
    />
  );
  return (
    <div className="flex flex-col gap-8">
      <SpotlightGrid
        label={t('spotlight.grid.events.thisWeek')}
        spotlight={<FeaturedCard event={featured} onOpen={onOpen} />}
        tiles={thisWeek.map((e) => eventCard(e, 'standard'))}
        row={upcoming.length > 0 ? { title: t('spotlight.grid.events.upcoming'), items: upcoming.map((e) => eventCard(e, 'compact')) } : undefined}
      />
      {(liveItems.length > 0 || followedItems.length > 0) && (
        <section className="flex flex-col gap-6" data-spotlight-section="events-around">
          {liveItems.length > 0 && (
            <CompactBlock block="live" title={t('spotlightSocial.events.liveNow')}>
              {liveItems.map((e) => eventCard(e, 'compact'))}
            </CompactBlock>
          )}
          {followedItems.length > 0 && (
            <CompactBlock block="following" title={t('spotlightSocial.events.youFollow')}>
              {followedItems.map((m) => (
                <SocialVCard key={m.user_id} data={memberToVCard(m)} size="compact" className="h-full" />
              ))}
            </CompactBlock>
          )}
        </section>
      )}
    </div>
  );
}
