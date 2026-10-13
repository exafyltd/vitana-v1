import { CalendarDays, Users } from 'lucide-react';
import { eventToVCard, groupToVCard, liveRoomToVCard } from '@/components/ui/vcard/adapters';
import type { EventLike } from '@/components/ui/vcard/adapters/event';
import type { GroupLike } from '@/components/ui/vcard/adapters/group';
import type { LiveRoomLike } from '@/components/ui/vcard/adapters/liveRoom';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n-toast';
import { FullRowGrid } from './FullRowGrid';
import { SocialVCard } from './SocialVCard';
import { SpotlightSection } from './SpotlightSection';
import { GridSkeleton, SocialEmpty, SocialError } from './SocialStates';

/**
 * VTID-05110 — Community overview on desktop Spotlight (`collection`, `wide`).
 *
 * Only real data (SR-24): rooms live right now, today's events, the rest of
 * this week, and groups the viewer has not joined yet. The legacy overview's
 * mock highlight rows, invented counters and the dead search are not part of
 * this view. Every grid renders only full rows (SR-13); each section has its
 * own loading, empty and error state (SR-25).
 */
export interface CommunitySpotlightBodyProps {
  live: LiveRoomLike[];
  today: EventLike[];
  week: EventLike[];
  eventsLoading: boolean;
  groups: GroupLike[];
  groupsLoading: boolean;
  groupsError?: boolean;
  onRetryGroups?: () => void;
  onBrowseEvents: () => void;
  onCreateGroup: () => void;
}

function LiveBadge() {
  return <Badge className="bg-destructive text-destructive-foreground">{t('spotlightSocial.common.live')}</Badge>;
}

export function CommunitySpotlightBody({
  live,
  today,
  week,
  eventsLoading,
  groups,
  groupsLoading,
  groupsError,
  onRetryGroups,
  onBrowseEvents,
  onCreateGroup,
}: CommunitySpotlightBodyProps) {
  const eventCard = (e: EventLike, size: 'standard' | 'row') => <SocialVCard key={e.id} data={eventToVCard(e)} size={size} />;

  return (
    <div className="flex flex-col gap-8">
      {live.length > 0 && (
        <SpotlightSection id="community-live" title={t('spotlightSocial.community.liveNow')} seeAllTo="/comm/live-rooms">
          <div className="flex flex-col gap-2">
            {live.slice(0, 3).map((room) => (
              <SocialVCard key={room.id} data={liveRoomToVCard(room)} size="row" badge={<LiveBadge />} />
            ))}
          </div>
        </SpotlightSection>
      )}

      <SpotlightSection id="community-today" title={t('spotlightSocial.community.today')} seeAllTo="/comm/events-meetups?tab=today">
        {eventsLoading && today.length === 0 ? (
          <GridSkeleton cols={3} count={3} />
        ) : today.length === 0 ? (
          <SocialEmpty
            spec={{
              Icon: CalendarDays,
              titleKey: 'spotlightSocial.community.emptyTodayTitle',
              descriptionKey: 'spotlightSocial.community.emptyTodayDesc',
              actionKey: 'spotlightSocial.community.openEvents',
              onAction: onBrowseEvents,
            }}
          />
        ) : (
          <FullRowGrid items={today.slice(0, 6)} cols={3} renderItem={eventCard} />
        )}
      </SpotlightSection>

      <SpotlightSection id="community-week" title={t('spotlightSocial.community.thisWeek')} seeAllTo="/comm/events-meetups?tab=upcoming">
        {eventsLoading && week.length === 0 ? (
          <GridSkeleton cols={3} count={3} />
        ) : week.length === 0 ? (
          <SocialEmpty
            spec={{
              Icon: CalendarDays,
              titleKey: 'spotlightSocial.community.emptyWeekTitle',
              descriptionKey: 'spotlightSocial.community.emptyWeekDesc',
              actionKey: 'spotlightSocial.community.openEvents',
              onAction: onBrowseEvents,
            }}
          />
        ) : (
          <FullRowGrid items={week.slice(0, 6)} cols={3} renderItem={eventCard} />
        )}
      </SpotlightSection>

      <SpotlightSection id="community-groups" title={t('spotlightSocial.community.groups')} seeAllTo="/comm/groups?tab=recommended">
        {groupsError ? (
          <SocialError onRetry={onRetryGroups} />
        ) : groupsLoading && groups.length === 0 ? (
          <GridSkeleton cols={3} count={3} />
        ) : groups.length === 0 ? (
          <SocialEmpty
            spec={{
              Icon: Users,
              titleKey: 'spotlightSocial.community.emptyGroupsTitle',
              descriptionKey: 'spotlightSocial.community.emptyGroupsDesc',
              actionKey: 'spotlightSocial.groups.createAction',
              onAction: onCreateGroup,
            }}
          />
        ) : (
          <FullRowGrid
            items={groups.slice(0, 6)}
            cols={3}
            renderItem={(g, size) => <SocialVCard key={g.id} data={groupToVCard(g)} size={size} />}
          />
        )}
      </SpotlightSection>
    </div>
  );
}
