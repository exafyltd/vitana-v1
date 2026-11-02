/**
 * VTID-05430 (Native Wave 2, public-profile lane) — native twin of the mobile
 * branch (`useIsMobile()`) of the web `src/components/profile/shared/ProfileLayout.tsx`
 * as `PublicProfilePage` renders it for a signed-in visitor (`editMode={false}`):
 * the identity card on top, then the sticky Posts / About / Media / Groups tab
 * bar (web `MobileProfileTabs`, Posts first) and the active tab's content —
 *   Posts  → the About card + the member's posts (web `ProfilePostsTab`, read);
 *   About  → the bio card + the life-milestone timeline (web `MilestoneTimeline`);
 *   Media  → the photo gallery (web `PhotoGallery`);
 *   Groups → up to three groups + View all / Discover (web `MobileGroupsTabContent`).
 * Same catalog keys as the web components.
 *
 * Read-only (requirements R5): this lane ports the page's reads. The visitor's
 * write and gateway surfaces of the web layout — Follow / Message (+ compose
 * modal), the share sheet + QR screen, post likes / comments, the video and
 * music galleries, the Business card side, and the page's gateway sections
 * below the layout (WhyThisMatchCard, Dance / Partner-preferences / Service
 * offerings / MyPosts) — are recorded as follow-ups in
 * docs/validation/VTID-05430/verification.md, not silently dropped.
 * React 19: `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Icon, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import { radius } from '../../ports/tokens';
import { useUserGroups, type UserGroup } from '../../ports/user-groups';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { useProfilePosts } from './data/profile';
import { formatMonthYear, formatNumber } from './format';
import type { GalleryPhoto, Milestone, ProfilePost, PublicProfile } from './types';

export type MobileProfileTab = 'posts' | 'about' | 'media' | 'groups';
const TABS: ReadonlyArray<{ id: MobileProfileTab; labelKey: string }> = [
  { id: 'posts', labelKey: 'profileTabs.posts' },
  { id: 'about', labelKey: 'profileTabs.about' },
  { id: 'media', labelKey: 'profileTabs.media' },
  { id: 'groups', labelKey: 'profileTabs.groups' },
];

type Props = { profile: PublicProfile; milestones: Milestone[]; galleryPhotos: GalleryPhoto[] };

function initials(name: string): string {
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function IdentityCard({ profile }: { profile: PublicProfile }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Card testID="profile-identity" style={styles.identity}>
      <View style={[styles.identityCover, { backgroundColor: colors.muted }]}>
        {profile.coverUrl ? <Image source={{ uri: profile.coverUrl }} accessibilityLabel={t('screens.profile.cover')} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
      </View>
      <View style={styles.identityBody}>
        <View style={[styles.avatarRing, { borderColor: colors.card }]}>
          <Avatar uri={profile.avatarUrl || null} fallback={profile.name?.charAt(0) || '?'} size={88} />
        </View>
        <Text size="xl" weight="700" accessibilityRole="header">
          {profile.name}
        </Text>
        {profile.handle ? (
          <Text variant="caption" muted>
            {`@${profile.handle}`}
          </Text>
        ) : null}
        {profile.vitanaIndex ? (
          <View testID="profile-vitana-index" style={[styles.indexPill, { borderColor: colors.border }]}>
            <Text weight="700">{t('publicProfileNative.landing.vitanaIndex', { score: profile.vitanaIndex })}</Text>
          </View>
        ) : null}
        {profile.location ? (
          <View style={styles.inlineRow}>
            <Icon name="MapPin" size={14} color={colors.mutedForeground} />
            <Text variant="caption" muted>
              {profile.location}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function TabBar({ active, onChange }: { active: MobileProfileTab; onChange: (tab: MobileProfileTab) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={t('publicProfileNative.member.sections')} style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <PressableRow
            key={tab.id}
            testID={`profile-tab-${tab.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, { borderBottomColor: selected ? colors.primary : colors.background }]}
          >
            <Text weight="500" color={selected ? colors.primary : colors.mutedForeground}>
              {t(tab.labelKey)}
            </Text>
          </PressableRow>
        );
      })}
    </View>
  );
}

function PostCard({ post }: { post: ProfilePost }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Card testID={`profile-post-${post.id}`} style={styles.card}>
      {post.content ? <Text style={styles.body}>{post.content}</Text> : null}
      {post.image_url ? (
        <View style={[styles.postImage, { backgroundColor: colors.muted }]}>
          <Image source={{ uri: post.image_url }} accessibilityLabel={t('screens.profile.postImage')} resizeMode="cover" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      <View style={styles.inlineRowStart}>
        <Icon name="Heart" size={14} color={colors.mutedForeground} />
        <Text variant="caption" muted>
          {t('publicProfileNative.post.likes', { count: post.likes_count || 0 })}
        </Text>
        <Icon name="MessageSquare" size={14} color={colors.mutedForeground} />
        <Text variant="caption" muted>
          {t('publicProfileNative.post.comments', { count: post.comments_count || 0 })}
        </Text>
      </View>
    </Card>
  );
}

function PostsTab({ profile }: { profile: PublicProfile }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data: posts = [], isLoading } = useProfilePosts(profile.id);
  return (
    <View style={styles.tabContent}>
      {profile.bio ? (
        <Card testID="profile-posts-about" style={styles.card}>
          <Text size="lg" weight="600">
            {t('editProfile.about')}
          </Text>
          <Text style={styles.body}>{profile.bio}</Text>
          {profile.location ? (
            <View style={styles.inlineRowStart}>
              <Icon name="MapPin" size={14} color={colors.mutedForeground} />
              <Text variant="caption" muted>
                {profile.location}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}
      {isLoading ? (
        <Text muted style={styles.centerText}>
          {t('screens.profile.loading')}
        </Text>
      ) : posts.length === 0 ? (
        <View testID="profile-posts-empty" style={styles.empty}>
          <Icon name="MessageSquare" size={32} color={colors.mutedForeground} />
          <Text weight="600">{t('profilePosts.emptyTitle')}</Text>
          <Text variant="caption" muted style={styles.centerText}>
            {t('profilePosts.emptyDescription')}
          </Text>
        </View>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </View>
  );
}

function AboutTab({ profile, milestones }: { profile: PublicProfile; milestones: Milestone[] }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.tabContent}>
      <Card testID="profile-about" style={styles.card}>
        <Text weight="600">{t('screens.profile.about')}</Text>
        <Text variant="caption" muted>
          {profile.bio || t('publicProfileNative.member.noBio')}
        </Text>
      </Card>
      <Text size="lg" weight="600" accessibilityRole="header">
        {t('milestones.title')}
      </Text>
      {milestones.length === 0 ? (
        <Card testID="profile-milestones-empty" style={[styles.card, styles.empty]}>
          <Text muted>{t('milestones.empty')}</Text>
        </Card>
      ) : (
        milestones.map((m) => (
          <View key={m.id} testID={`profile-milestone-${m.id}`} style={styles.milestoneRow}>
            <View style={[styles.milestoneDot, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Text size="lg">{m.icon || '⭐'}</Text>
            </View>
            <Card style={[styles.card, styles.fill]}>
              <Text weight="600">{m.title}</Text>
              {m.description ? (
                <Text variant="caption" muted numberOfLines={2}>
                  {m.description}
                </Text>
              ) : null}
              {m.milestone_date ? (
                <View style={styles.inlineRowStart}>
                  <Icon name="Calendar" size={12} color={colors.mutedForeground} />
                  <Text variant="caption" muted>
                    {formatMonthYear(m.milestone_date, locale)}
                  </Text>
                </View>
              ) : null}
            </Card>
          </View>
        ))
      )}
    </View>
  );
}

function MediaTab({ photos }: { photos: GalleryPhoto[] }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.tabContent}>
      <Text size="lg" weight="600" accessibilityRole="header">
        {t('gallery.title')}
      </Text>
      {photos.length === 0 ? (
        <Card testID="profile-photos-empty" style={[styles.card, styles.empty]}>
          <Text muted>{t('gallery.empty')}</Text>
        </Card>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <View key={photo.id} style={[styles.photoCell, { backgroundColor: colors.muted }]}>
              <Image
                testID={`profile-photo-${photo.id}`}
                source={{ uri: photo.image_url }}
                accessibilityLabel={photo.caption || t('gallery.photo')}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function GroupsTab({ userId }: { userId: string }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const { data: groups = [], isLoading } = useUserGroups(userId);
  const discover = () => navigateToWebPath('/comm/groups?discover=true');

  if (isLoading) {
    return (
      <View style={styles.tabContent}>
        <Spinner accessibilityLabel={t('common.loading')} />
      </View>
    );
  }
  if (groups.length === 0) {
    return (
      <View testID="profile-groups-empty" style={[styles.tabContent, styles.empty]}>
        <Icon name="Users" size={32} color={colors.primary} />
        <Text weight="500">{t('profileGroups.emptyTitle')}</Text>
        <Text variant="caption" muted style={styles.centerText}>
          {t('profileGroups.emptyDescription')}
        </Text>
        <Button testID="profile-groups-discover" size="sm" onPress={discover}>
          {t('profileGroups.discoverCta')}
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      {groups.slice(0, 3).map((group: UserGroup) => (
        <PressableRow
          key={group.id}
          testID={`profile-group-${group.id}`}
          accessibilityLabel={group.name}
          onPress={() => navigateToWebPath(`/comm/groups/${group.id}`)}
          style={[styles.groupRow, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Avatar uri={group.avatar_url} fallback={initials(group.name)} size={48} />
          <View style={styles.fill}>
            <Text weight="500" numberOfLines={1}>
              {group.name}
            </Text>
            <View style={styles.inlineRowStart}>
              <Icon name="Users" size={12} color={colors.mutedForeground} />
              <Text variant="caption" muted>
                {`${formatNumber(group.member_count, locale)} ${t('profileGroups.membersLabel')}`}
              </Text>
            </View>
          </View>
          <Icon name="ChevronRight" size={16} color={colors.mutedForeground} />
        </PressableRow>
      ))}
      <Button testID="profile-groups-view-all" variant="outline" onPress={() => navigateToWebPath('/comm/groups')}>
        {t('profileGroups.viewAllCta')}
      </Button>
      <Button testID="profile-groups-discover" variant="soft" onPress={discover}>
        {t('profileGroups.discoverCta')}
      </Button>
    </View>
  );
}

export function PublicProfileMemberView({ profile, milestones, galleryPhotos }: Props): ReactElement {
  const { colors } = useUITheme();
  const [tab, setTab] = useState<MobileProfileTab>('posts');
  return (
    <ScrollView testID="public-profile-member" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} stickyHeaderIndices={[1]}>
      <IdentityCard profile={profile} />
      <TabBar active={tab} onChange={setTab} />
      {tab === 'posts' ? <PostsTab profile={profile} /> : null}
      {tab === 'about' ? <AboutTab profile={profile} milestones={milestones} /> : null}
      {tab === 'media' ? <MediaTab photos={galleryPhotos} /> : null}
      {tab === 'groups' ? <GroupsTab userId={profile.id} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 128 },
  identity: { margin: 16, overflow: 'hidden', borderRadius: radius.lg, padding: 0 },
  identityCover: { height: 120, width: '100%' },
  identityBody: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, marginTop: -44, gap: 4 },
  avatarRing: { borderWidth: 4, borderRadius: 999 },
  indexPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4, marginTop: 4 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  inlineRowStart: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2 },
  tabContent: { padding: 16, gap: 12 },
  card: { padding: 16, gap: 6, borderRadius: radius.lg },
  body: { lineHeight: 24 },
  postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, overflow: 'hidden' },
  centerText: { textAlign: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
  milestoneRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  milestoneDot: { width: 48, height: 48, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '48%', aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' },
  groupRow: { gap: 12, padding: 12, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
