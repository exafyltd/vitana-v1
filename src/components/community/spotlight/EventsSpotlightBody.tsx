import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SpotlightLayout } from '@/components/layout/spotlight';
import { eventToVCard, memberToVCard, type VCardData } from '@/components/ui/vcard/adapters';
import type { MemberLike } from '@/components/ui/vcard/adapters/member';
import { isOngoingLiveRoom } from '@/components/events/EventsLiveRooms';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { SocialVCard } from './SocialVCard';
import { RailHeading, SpotlightSection } from './SpotlightSection';
import { SocialEmpty, StageListSkeleton, type EmptySpec } from './SocialStates';

/**
 * VTID-05110 — Events & Meetups on desktop Spotlight (mockup 05): the first
 * event of the active tab is the one `spotlight` card, the rest follow as a
 * `row` list (no bento grid, so no empty slots), and the context rail holds
 * the rooms that are live right now and the people the viewer follows.
 *
 * Presentational only: the page keeps every handler (drawer, deep links,
 * search, create) and passes them in.
 */
export interface EventsSpotlightBodyProps {
  events: CommunityEvent[];
  loading: boolean;
  liveNow: CommunityEvent[];
  followed?: MemberLike[];
  onOpen: (event: CommunityEvent) => void;
  empty: EmptySpec;
}

function LiveBadge() {
  return <Badge className="bg-destructive text-destructive-foreground">{t('spotlightSocial.common.live')}</Badge>;
}

export function EventsSpotlightBody({ events, loading, liveNow, followed = [], onOpen, empty }: EventsSpotlightBodyProps) {
  const [featured, ...more] = events;
  const liveRail = liveNow.filter((e) => e.id !== featured?.id).slice(0, 4);

  const rail =
    liveRail.length > 0 || followed.length > 0 ? (
      <>
        {liveRail.length > 0 && (
          <div className="flex flex-col gap-2" data-rail-block="live">
            <RailHeading>{t('spotlightSocial.events.liveNow')}</RailHeading>
            {liveRail.map((e) => (
              <SocialVCard key={e.id} data={eventToVCard(e)} size="compact" onOpen={() => onOpen(e)} />
            ))}
          </div>
        )}
        {followed.length > 0 && (
          <div className="flex flex-col gap-2" data-rail-block="following">
            <RailHeading>{t('spotlightSocial.events.youFollow')}</RailHeading>
            {followed.slice(0, 6).map((m) => (
              <SocialVCard key={m.user_id} data={memberToVCard(m)} size="row" />
            ))}
          </div>
        )}
      </>
    ) : undefined;

  let stage: ReactNode;
  if (loading && events.length === 0) {
    stage = <StageListSkeleton />;
  } else if (!featured) {
    stage = <SocialEmpty spec={empty} />;
  } else {
    const data: VCardData = eventToVCard(featured);
    stage = (
      <div className="flex flex-col gap-6">
        <SocialVCard
          data={{ ...data, eyebrow: data.eyebrow ? `${t('spotlightSocial.events.featured')} · ${data.eyebrow}` : t('spotlightSocial.events.featured') }}
          size="spotlight"
          priority
          showBody
          onOpen={() => onOpen(featured)}
          badge={isOngoingLiveRoom(featured) ? <LiveBadge /> : undefined}
          actions={
            <>
              <Button size="sm" onClick={() => onOpen(featured)}>
                {t('spotlightSocial.common.details')}
              </Button>
              {featured.participant_count > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t('spotlightSocial.events.going', { count: fmtNumber(featured.participant_count) })}
                </span>
              )}
            </>
          }
        />
        {more.length > 0 && (
          <SpotlightSection id="events-more" title={t('spotlightSocial.events.more')}>
            <div className="flex flex-col gap-2">
              {more.map((e) => (
                <SocialVCard
                  key={e.id}
                  data={eventToVCard(e)}
                  size="row"
                  onOpen={() => onOpen(e)}
                  badge={isOngoingLiveRoom(e) ? <LiveBadge /> : undefined}
                />
              ))}
            </div>
          </SpotlightSection>
        )}
      </div>
    );
  }

  return (
    <SpotlightLayout width="stage-rail" rail={rail}>
      {stage}
    </SpotlightLayout>
  );
}
