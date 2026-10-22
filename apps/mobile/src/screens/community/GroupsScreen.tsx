/**
 * VTID-05296 (N-W2 community-hub) — native port of the web Groups screen
 * (`src/pages/community/Groups.tsx`, mobile-web branch). Two tabs — My groups
 * and Discover (recommended) — each a list of group cards; Discover cards
 * carry a Join/Leave action. 1:1 parity with the phone web screen.
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Badge, Skeleton, Text, Avatar, Icon, TextInput } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { ScreenScaffold, CardRow, FilterChips, ListEmpty, ListError } from './components';
import { CreateGroupSheet } from './CreateGroupSheet';
import {
  useUserGroups,
  useGroupDirectory,
  useGroupMembership,
  type UserGroup,
  type DirectoryGroup,
} from './data/groups';

type Tab = 'my-groups' | 'recommended';

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

function JoinLeaveButton({ groupId }: { groupId: string }) {
  const { t } = useI18n();
  const { isMember, joinGroup, leaveGroup, isJoining, isLeaving, checkingMembership } = useGroupMembership(groupId);
  if (checkingMembership) return null;
  return isMember ? (
    <Button variant="outline" size="sm" disabled={isLeaving} onPress={leaveGroup} testID={`group-leave-${groupId}`}>
      {isLeaving ? t('communityHubNative.groups.leaving') : t('communityHubNative.groups.leave')}
    </Button>
  ) : (
    <Button size="sm" disabled={isJoining} onPress={joinGroup} testID={`group-join-${groupId}`}>
      {isJoining ? t('communityHubNative.groups.joining') : t('communityHubNative.groups.join')}
    </Button>
  );
}

function GroupCard({ group, action }: { group: UserGroup | DirectoryGroup; action?: ReactNode }) {
  const { t } = useI18n();
  const isPublic = 'is_public' in group ? group.is_public : undefined;
  return (
    <CardRow
      onPress={() => navigateToWebPath(`/comm/groups/${group.id}`)}
      accessibilityLabel={group.name}
      testID={`group-card-${group.id}`}
    >
      <View style={styles.groupHeader}>
        <Avatar uri={group.avatar_url} fallback={initialsOf(group.name)} size={48} />
        <View style={styles.fill}>
          <Text weight="700" numberOfLines={1}>
            {group.name}
          </Text>
          <View style={styles.metaRow}>
            <Icon name="Users" size={14} />
            <Text variant="caption" muted>
              {t('communityHubNative.groups.memberCount', { count: group.member_count })}
            </Text>
          </View>
        </View>
      </View>
      {group.category || isPublic !== undefined ? (
        <View style={styles.badgeRow}>
          {isPublic !== undefined ? (
            <Badge variant="outline">
              {isPublic ? t('communityHubNative.groups.public') : t('communityHubNative.groups.private')}
            </Badge>
          ) : null}
          {group.category ? <Badge variant="secondary">{group.category}</Badge> : null}
        </View>
      ) : null}
      {action ? <View style={styles.actionRow}>{action}</View> : null}
    </CardRow>
  );
}

export function GroupsScreen({ initialTab = 'my-groups' as Tab }: { initialTab?: Tab }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: myGroups = [], isLoading: loadingMyGroups } = useUserGroups(user?.id);
  // The directory query takes the search term (web `useGroupDirectory(searchQuery)`).
  const { data: allGroups = [], isLoading: loadingDirectory, isError: directoryError, refetch: refetchDirectory } =
    useGroupDirectory(activeTab === 'recommended' ? search : undefined);

  const myGroupIds = new Set(myGroups.map((g) => g.id));
  const recommendedGroups = allGroups.filter((g) => !myGroupIds.has(g.id));
  const mine = activeTab !== 'recommended';

  // My-groups is a client-side name filter over the loaded list (web search box
  // drives both tabs). Discover forwards the term to the directory query above.
  const q = search.trim().toLowerCase();
  const visibleMine = q ? myGroups.filter((g) => g.name.toLowerCase().includes(q)) : myGroups;

  return (
    <ScreenScaffold
      title={t('communityHubNative.groups.title')}
      subtitle={t('communityHubNative.groups.subtitle')}
      action={
        <Button size="sm" onPress={() => setCreateOpen(true)} testID="groups-create">
          {t('communityHubNative.groups.create')}
        </Button>
      }
      testID="screen-groups"
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('communityHubNative.groups.searchPlaceholder')}
        accessibilityLabel={t('communityHubNative.groups.searchLabel')}
        testID="groups-search"
      />
      <FilterChips
        groupLabel={t('communityHubNative.groups.tabsLabel')}
        chips={[
          { key: 'my-groups', label: t('communityHubNative.groups.tabMine') },
          { key: 'recommended', label: t('communityHubNative.groups.tabDiscover') },
        ]}
        selected={activeTab}
        onSelect={(k) => setActiveTab(k as Tab)}
        testID="groups-tab"
      />

      {mine ? (
        loadingMyGroups ? (
          <GroupSkeletons count={3} />
        ) : visibleMine.length === 0 ? (
          <ListEmpty
            title={t('communityHubNative.groups.emptyMineTitle')}
            description={t('communityHubNative.groups.emptyMineDesc')}
            testID="groups-empty-mine"
          />
        ) : (
          <View style={styles.list} testID="groups-list-mine">
            {visibleMine.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </View>
        )
      ) : loadingDirectory ? (
        <GroupSkeletons count={6} />
      ) : directoryError ? (
        <ListError
          message={t('communityHubNative.common.errorBody')}
          retryLabel={t('communityHubNative.common.retry')}
          onRetry={() => void refetchDirectory()}
        />
      ) : recommendedGroups.length === 0 ? (
        <ListEmpty
          title={t('communityHubNative.groups.emptyDiscoverTitle')}
          description={t('communityHubNative.groups.emptyDiscoverDesc')}
          testID="groups-empty-discover"
        />
      ) : (
        <View style={styles.list} testID="groups-list-discover">
          {recommendedGroups.map((g) => (
            <GroupCard key={g.id} group={g} action={<JoinLeaveButton groupId={g.id} />} />
          ))}
        </View>
      )}

      <CreateGroupSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </ScreenScaffold>
  );
}

function GroupSkeletons({ count }: { count: number }) {
  return (
    <View style={styles.list} testID="groups-skeletons">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} style={styles.skeleton} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  fill: { flex: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionRow: { marginTop: 12, alignSelf: 'stretch', alignItems: 'flex-start' },
  skeleton: { height: 96, borderRadius: 16 },
});
