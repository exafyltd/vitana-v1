import { Button } from '@/components/ui/button';
import { groupToVCard } from '@/components/ui/vcard/adapters';
import type { GroupLike } from '@/components/ui/vcard/adapters/group';
import { useGroupMembership } from '@/hooks/useGroupMembership';
import { t } from '@/lib/i18n-toast';
import { FullRowGrid } from './FullRowGrid';
import { SocialVCard } from './SocialVCard';
import { GridSkeleton, SocialEmpty, type EmptySpec } from './SocialStates';

/**
 * VTID-05110 — Groups on desktop Spotlight (`collection`): a `standard` grid
 * that renders only full rows, the remainder as a `row` list. Join / Leave
 * keeps using the existing membership hook; everything else is the page's.
 */
export function GroupJoinButton({ groupId }: { groupId: string }) {
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(groupId);
  if (checkingMembership) return null;
  return isMember ? (
    <Button size="sm" variant="outline" onClick={() => leaveGroup()} disabled={isLeaving}>
      {t('spotlightSocial.groups.leave')}
    </Button>
  ) : (
    <Button size="sm" onClick={() => joinGroup()} disabled={isJoining}>
      {t('spotlightSocial.groups.join')}
    </Button>
  );
}

export interface GroupsSpotlightBodyProps {
  groups: GroupLike[];
  loading: boolean;
  /** Show Join / Leave on each card (the Discover tab). */
  withJoin?: boolean;
  empty: EmptySpec;
}

export function GroupsSpotlightBody({ groups, loading, withJoin = false, empty }: GroupsSpotlightBodyProps) {
  if (loading && groups.length === 0) return <GridSkeleton cols={3} count={6} />;
  if (groups.length === 0) return <SocialEmpty spec={empty} />;
  return (
    <FullRowGrid
      items={groups}
      cols={3}
      renderItem={(group, size) => (
        <SocialVCard
          key={group.id}
          data={groupToVCard(group)}
          size={size}
          actions={withJoin ? <GroupJoinButton groupId={group.id} /> : undefined}
        />
      )}
    />
  );
}
