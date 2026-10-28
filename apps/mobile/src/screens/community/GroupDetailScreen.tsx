/**
 * VTID-05296 (N-W2 community-hub) — native port of the web group detail screen
 * (`src/pages/community/GroupDetail.tsx`, mobile-web branch). Cover + title +
 * member count + public/private badge + category, a Join/Leave action, the
 * description, and a members preview. Not-found and loading states match the
 * web. The group feed itself is a separate (not-yet-ported) surface, so the
 * native screen links out to it rather than inlining unported content.
 */
import { StyleSheet, View } from 'react-native';
import { Button, Badge, Skeleton, Text, Avatar, Icon } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { router } from 'expo-router';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, ListEmpty } from './components';
import { useGroupDetail, useGroupMembersPreview, useGroupMembership } from './data/groups';

export function GroupDetailScreen({ id }: { id: string | undefined }) {
  const { t } = useI18n();
  const { data: group, isLoading, isError } = useGroupDetail(id);
  const { data: members = [] } = useGroupMembersPreview(id);
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(id);

  const back = () => (router.canGoBack() ? router.back() : navigateToWebPath('/comm/groups'));

  if (isLoading) {
    return (
      <ScreenScaffold title={t('communityHubNative.groupDetail.title')} testID="screen-group-detail">
        <Skeleton style={styles.coverSkeleton} />
        <Skeleton style={styles.lineSkeleton} />
        <Skeleton style={styles.lineSkeletonShort} />
      </ScreenScaffold>
    );
  }

  if (isError || !group) {
    return (
      <ScreenScaffold title={t('communityHubNative.groupDetail.title')} testID="screen-group-detail">
        <ListEmpty
          title={t('communityHubNative.groupDetail.notFoundTitle')}
          description={t('communityHubNative.groupDetail.notFoundDesc')}
          testID="group-detail-not-found"
        />
        <View style={styles.center}>
          <Button variant="outline" size="sm" onPress={() => navigateToWebPath('/comm/groups')} testID="group-detail-browse">
            {t('communityHubNative.groupDetail.browse')}
          </Button>
        </View>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      title={group.name}
      action={
        <Button variant="ghost" size="sm" onPress={back} testID="group-detail-back">
          {t('communityHubNative.common.back')}
        </Button>
      }
      testID="screen-group-detail"
    >
      <View style={styles.metaRow}>
        <Icon name="Users" size={16} />
        <Text variant="caption" muted>
          {t('communityHubNative.groupDetail.memberCount', { count: group.member_count })}
        </Text>
        <Badge variant="outline">
          {group.is_public ? t('communityHubNative.groups.public') : t('communityHubNative.groups.private')}
        </Badge>
        {group.category ? <Badge variant="secondary">{group.category}</Badge> : null}
      </View>

      {!checkingMembership ? (
        isMember ? (
          <Button variant="outline" size="sm" disabled={isLeaving} onPress={leaveGroup} testID="group-detail-leave">
            {isLeaving ? t('communityHubNative.groups.leaving') : t('communityHubNative.groupDetail.leave')}
          </Button>
        ) : (
          <Button size="sm" disabled={isJoining} onPress={joinGroup} testID="group-detail-join">
            {isJoining ? t('communityHubNative.groups.joining') : t('communityHubNative.groupDetail.join')}
          </Button>
        )
      ) : null}

      {group.description ? (
        <Text style={styles.description}>{group.description}</Text>
      ) : null}

      <View style={styles.membersCard} testID="group-detail-members-preview">
        <Text weight="600" style={styles.membersHeading}>
          {t('communityHubNative.groupDetail.membersWithCount', { count: group.member_count })}
        </Text>
        <View style={styles.avatarRow}>
          {members.map((m) => (
            <Avatar key={m.user_id} fallback={m.role === 'admin' ? '★' : '•'} size={36} />
          ))}
          {group.member_count > members.length ? (
            <Text variant="caption" muted>
              {t('communityHubNative.groupDetail.plusMore', { count: group.member_count - members.length })}
            </Text>
          ) : null}
        </View>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  coverSkeleton: { height: 160, borderRadius: 16 },
  lineSkeleton: { height: 20, borderRadius: 8 },
  lineSkeletonShort: { height: 16, borderRadius: 8, width: '60%' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  description: { lineHeight: 22 },
  membersCard: { gap: 12 },
  membersHeading: {},
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  center: { alignItems: 'center' },
});
