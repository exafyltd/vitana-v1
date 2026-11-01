/**
 * VTID-05429 (Native Wave 2, profile lane) — the Posts / About / Media /
 * Groups tab bodies under the ID card on the web mobile `/me/profile`
 * (`EditProfilePage.tsx` mobile branch):
 *
 *   PostsTab   ← showcase header (`MobileShowcaseHeader`) + hint, then the
 *                member's posts (`ProfilePostsTab`, own posts + Create post)
 *   AboutTab   ← the tap-to-edit About card + `MilestoneTimeline`
 *   MediaTab   ← `PhotoGallery`
 *   GroupsTab  ← `MobileGroupsTabContent` (3-group preview, view all / discover)
 *
 * Reads only (data/profile.ts); "Create post" opens the native composer the
 * home lane already ports (`MobileCreatePostSheet`, the same web component).
 * React 19: `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Avatar, Button, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { SectionCard } from './components';
import { initialsOf } from './ProfileCards';
import { useProfileGallery, useProfileMilestones, useProfilePosts, useUserGroups, type MyProfile } from './data/profile';

function Empty({ title, description, testID }: { title: string; description?: string; testID: string }): ReactElement {
  return (
    <View style={styles.empty} testID={testID}>
      <Text weight="600">{title}</Text>
      {description ? (
        <Text variant="caption" muted style={styles.centerText}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

export function PostsTab({ profile, onManageShowcase, onCreatePost }: { profile: MyProfile; onManageShowcase: () => void; onCreatePost: () => void }): ReactElement {
  const { t } = useI18n();
  const posts = useProfilePosts(profile.userId);
  return (
    <View style={styles.tabBody} testID="profile-tab-posts">
      <View style={styles.showcaseHeader}>
        <Text weight="600" style={styles.fill}>
          {t('editProfile.showcaseTitle')}
        </Text>
        <Button size="sm" variant="ghost" onPress={onManageShowcase} testID="profile-showcase-manage">
          {t('editProfile.manage')}
        </Button>
      </View>
      <Text variant="caption" muted>
        {t('editProfile.showcaseHint')}
      </Text>
      <Button variant="outline" onPress={onCreatePost} testID="profile-create-post">
        {t('profilePosts.createPost')}
      </Button>
      {posts.isLoading ? (
        <Spinner />
      ) : (posts.data ?? []).length === 0 ? (
        <Empty title={t('profilePosts.emptyTitle')} description={t('profilePosts.emptyDescription')} testID="profile-posts-empty" />
      ) : (
        <View style={styles.list} testID="profile-posts-list">
          {(posts.data ?? []).map((p) => (
            <SectionCard key={p.id} testID={`profile-post-${p.id}`}>
              {p.content ? <Text>{p.content}</Text> : null}
              {p.image_url ? <Image source={{ uri: p.image_url }} style={styles.postImage} accessibilityIgnoresInvertColors /> : null}
            </SectionCard>
          ))}
        </View>
      )}
    </View>
  );
}

export function AboutTab({ profile, onEditAbout }: { profile: MyProfile; onEditAbout: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const milestones = useProfileMilestones(profile.userId);
  return (
    <View style={styles.tabBody} testID="profile-tab-about">
      <PressableRow onPress={onEditAbout} accessibilityLabel={t('editProfile.about')} testID="profile-about-card" style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.fill}>
          <Text weight="600">{t('editProfile.about')}</Text>
          <Text muted testID="profile-about-bio">
            {profile.bio || t('editProfile.addBio')}
          </Text>
          <Text variant="caption" color={colors.primary}>
            {t('editProfile.tapToEdit')}
          </Text>
        </View>
      </PressableRow>
      <SectionCard title={t('milestones.title')} testID="profile-milestones">
        {milestones.isLoading ? (
          <Spinner />
        ) : (milestones.data ?? []).length === 0 ? (
          <Text variant="caption" muted testID="profile-milestones-empty">
            {t('milestones.empty')}
          </Text>
        ) : (
          (milestones.data ?? []).map((m) => (
            <View key={m.id} style={styles.milestone} testID={`profile-milestone-${m.id}`}>
              <Text>{m.icon}</Text>
              <View style={styles.fill}>
                <Text weight="600">{m.title}</Text>
                {m.description ? (
                  <Text variant="caption" muted>
                    {m.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </SectionCard>
    </View>
  );
}

export function MediaTab({ profile }: { profile: MyProfile }): ReactElement {
  const { t } = useI18n();
  const gallery = useProfileGallery(profile.userId);
  const photos = gallery.data ?? [];
  return (
    <View style={styles.tabBody} testID="profile-tab-media">
      <SectionCard title={t('gallery.title')}>
        {gallery.isLoading ? (
          <Spinner />
        ) : photos.length === 0 ? (
          <Empty title={t('gallery.empty')} testID="profile-gallery-empty" />
        ) : (
          <View style={styles.grid} testID="profile-gallery-grid">
            {photos.map((p) => (
              <Image
                key={p.id}
                source={{ uri: p.image_url }}
                style={styles.photo}
                accessibilityLabel={p.caption ?? t('gallery.photo')}
                testID={`profile-photo-${p.id}`}
              />
            ))}
          </View>
        )}
      </SectionCard>
    </View>
  );
}

export function GroupsTab({ profile }: { profile: MyProfile }): ReactElement {
  const { t, locale } = useI18n();
  const groups = useUserGroups(profile.userId);
  const list = groups.data ?? [];
  if (groups.isLoading) {
    return (
      <View style={styles.tabBody} testID="profile-tab-groups">
        <Spinner />
      </View>
    );
  }
  if (list.length === 0) {
    return (
      <View style={styles.tabBody} testID="profile-tab-groups">
        <Empty title={t('profileGroups.emptyTitle')} description={t('profileGroups.emptyDescription')} testID="profile-groups-empty" />
        <Button onPress={() => navigateToWebPath('/comm/groups?discover=true')} testID="profile-groups-discover">
          {t('profileGroups.discoverCta')}
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.tabBody} testID="profile-tab-groups">
      {list.slice(0, 3).map((g) => (
        <PressableRow key={g.id} onPress={() => navigateToWebPath(`/comm/groups/${g.id}`)} accessibilityLabel={g.name} testID={`profile-group-${g.id}`} style={styles.groupRow}>
          <Avatar uri={g.avatar_url} fallback={initialsOf(g.name)} size={48} />
          <View style={styles.fill}>
            <Text weight="600" numberOfLines={1}>
              {g.name}
            </Text>
            <Text variant="caption" muted>
              {`${new Intl.NumberFormat(locale).format(g.member_count ?? 0)} ${t('profileGroups.membersLabel')}`}
            </Text>
          </View>
        </PressableRow>
      ))}
      <Button variant="outline" onPress={() => navigateToWebPath('/comm/groups')} testID="profile-groups-view-all">
        {t('profileGroups.viewAllCta')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  tabBody: { gap: 12, paddingVertical: 12 },
  showcaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { gap: 12 },
  postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  aboutCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 16 },
  milestone: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  groupRow: { paddingVertical: 6 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  centerText: { textAlign: 'center' },
});
