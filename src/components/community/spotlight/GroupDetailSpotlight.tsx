import type { ReactNode } from 'react';
import { Globe, Lock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VCard } from '@/components/ui/vcard';
import { groupToVCard } from '@/components/ui/vcard/adapters';
import type { GroupLike } from '@/components/ui/vcard/adapters/group';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { SocialVCard } from './SocialVCard';
import { RailHeading, SpotlightSection } from './SpotlightSection';

/**
 * VTID-05110 — Group detail on desktop Spotlight (`detail`): the group itself
 * is the one `spotlight` card (cover, name, members, description, Join/Leave),
 * the group feed follows in the stage; the rail holds compact entry points
 * (members list, all groups). Presentational: the page passes the handlers.
 */
export interface GroupDetailStageProps {
  group: GroupLike & { is_public?: boolean | null };
  membership: {
    isMember: boolean;
    checking: boolean;
    isJoining: boolean;
    isLeaving: boolean;
    join: () => void;
    leave: () => void;
  };
  /** The group feed (existing GroupFeed component). */
  feed: ReactNode;
}

export function GroupDetailStage({ group, membership, feed }: GroupDetailStageProps) {
  const data = groupToVCard(group);
  const visibility =
    group.is_public == null ? null : (
      <Badge variant="secondary" className="gap-1">
        {group.is_public ? <Globe className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
        {group.is_public ? t('spotlightSocial.groups.public') : t('spotlightSocial.groups.private')}
      </Badge>
    );
  return (
    <div className="flex flex-col gap-6">
      <VCard
        size="spotlight"
        media={data.media}
        priority
        eyebrow={data.eyebrow}
        title={<h1 className="text-xl font-bold">{group.name}</h1>}
        meta={data.meta}
        badge={visibility}
        body={data.body}
        actions={
          membership.checking ? undefined : membership.isMember ? (
            <Button variant="outline" size="sm" onClick={membership.leave} disabled={membership.isLeaving}>
              {t('spotlightSocial.groups.leave')}
            </Button>
          ) : (
            <Button size="sm" onClick={membership.join} disabled={membership.isJoining}>
              {t('spotlightSocial.groups.join')}
            </Button>
          )
        }
      />
      <SpotlightSection id="group-feed" title={t('spotlightSocial.groupDetail.feed')}>
        {feed}
      </SpotlightSection>
    </div>
  );
}

export function GroupDetailRail({ memberCount, onShowMembers }: { memberCount: number; onShowMembers: () => void }) {
  return (
    <>
      <RailHeading>{t('spotlightSocial.groupDetail.membersTitle')}</RailHeading>
      <VCard
        size="compact"
        title={t('spotlightSocial.common.membersCount', { count: fmtNumber(memberCount) })}
        meta={t('spotlightSocial.groupDetail.showMembers')}
        actions={
          <Button size="icon" variant="ghost" onClick={onShowMembers} aria-label={t('spotlightSocial.groupDetail.showMembers')}>
            <Users className="h-4 w-4" aria-hidden="true" />
          </Button>
        }
      />
      <SocialVCard
        size="row"
        data={{ key: 'all-groups', title: t('spotlightSocial.groupDetail.browse'), meta: t('spotlightSocial.groupDetail.browseMeta'), href: '/comm/groups' }}
      />
    </>
  );
}
