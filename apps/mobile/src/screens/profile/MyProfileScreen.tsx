/**
 * VTID-05429 (Native Wave 2, profile lane) — native twin of the web
 * `/me/profile` (`src/pages/EditProfilePage.tsx`, the `useIsMobile()` branch;
 * ledger row PROFILE.ME).
 *
 * Layout, top to bottom, as on mobile web: the ID-card segmented control
 * (Identity / Social / Account / Business, persisted in the `card` search
 * param like the web `?card=`), the active card, then — except on Business —
 * the content stats strip and the Posts / About / Media / Groups tabs. The
 * edit entry points open bottom-sheet twins of the web drawers (Identity,
 * About, Account; the Showcase "Manage" sheet), and Share opens the system
 * share sheet with the web's canonical share URL.
 *
 * Data is read and written natively (data/profile.ts, plan decision 2). Not
 * ported in this lane (see docs/validation/VTID-05429/lane-brief.md): avatar /
 * cover / gallery uploads and the Cover Library (need the native image
 * picker), the Autopilot bio popup, the enrichment card strips, the QR share
 * screen, the interests picker, video / music galleries and milestone
 * editing. React 19: `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BottomSheet, Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { webConsoleUrl } from '../../identity/web-console';
import { MobileCreatePostSheet } from '../home/MobileCreatePostSheet';
import { Segmented, StatsStrip, UnderlineTabs } from './components';
import { AccountCard, BusinessCard, IdentityCard, SocialCard } from './ProfileCards';
import { AboutSheet, AccountSheet, IdentitySheet } from './ProfileSheets';
import { AboutTab, GroupsTab, MediaTab, PostsTab } from './ProfileTabs';
import { useMyProfile, useProfileStatsCount, type MyProfile } from './data/profile';

export type CardSide = 'front' | 'back' | 'account' | 'business';
const SIDES: readonly CardSide[] = ['front', 'back', 'account', 'business'];
export type ProfileTab = 'posts' | 'about' | 'media' | 'groups';
const TABS: readonly ProfileTab[] = ['posts', 'about', 'media', 'groups'];

/** Web `getActiveCardSide`: an unknown or missing `card` param is Identity. */
export function cardSideOf(param: string | string[] | undefined): CardSide {
  const v = Array.isArray(param) ? param[0] : param;
  return SIDES.includes(v as CardSide) ? (v as CardSide) : 'front';
}

/** Web `useProfileShare` `hashString` (djb2, base 36) — a stable cache-busting key, not security. */
export function shareHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/** Web `getShareUrl` path (`/profiles/<id>?v=<hash>`, salt v2) on this build's web base; null when the build has none. */
export function profileSharePath(profile: Pick<MyProfile, 'profileId' | 'avatarUrl'>): string {
  const versionInput = profile.avatarUrl && profile.avatarUrl.length > 0 ? profile.avatarUrl : `noavatar:${profile.profileId}`;
  return `/profiles/${encodeURIComponent(profile.profileId)}?v=${shareHash(`v2:${versionInput}`)}`;
}

type Sheet = 'identity' | 'about' | 'account' | 'showcase' | 'post' | null;

export function MyProfileScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ card?: string }>();
  const [side, setSide] = useState<CardSide>(() => cardSideOf(params.card));
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [sheet, setSheet] = useState<Sheet>(null);
  const query = useMyProfile();
  const profile = query.data;
  const stats = useProfileStatsCount(profile?.userId);

  const changeSide = (next: CardSide) => {
    setSide(next);
    // Persist like the web `?card=` (front clears it), so back-navigation returns here.
    router.setParams?.({ card: next === 'front' ? undefined : next } as never);
  };

  if (query.isLoading || (!profile && !query.isError)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="my-profile-loading">
        <Spinner accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  if (query.isError || !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="my-profile-error">
        <Text weight="600">{t('screens.profile.unableLoadProfile')}</Text>
        <Button variant="outline" onPress={() => void query.refetch()} testID="my-profile-retry">
          {t('common.retry')}
        </Button>
      </View>
    );
  }

  const shareUrl = webConsoleUrl(profileSharePath(profile));
  const share = shareUrl ? () => void Share.share({ message: shareUrl, url: shareUrl, title: t('share.shareProfile') }) : undefined;
  const close = () => setSheet(null);

  return (
    <>
      <ScrollView testID="screen-my-profile" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
        <Segmented
          testID="profile-card-switch"
          value={side}
          onChange={changeSide}
          segments={[
            { id: 'front', label: t('profile.tabs.identity') },
            { id: 'back', label: t('profile.tabs.social') },
            { id: 'account', label: t('profile.tabs.account') },
            { id: 'business', label: t('profile.tabs.business') },
          ]}
        />
        {side === 'front' ? <IdentityCard profile={profile} onEditIdentity={() => setSheet('identity')} onShare={share} /> : null}
        {side === 'back' ? <SocialCard profile={profile} onEdit={() => setSheet('about')} /> : null}
        {side === 'account' ? <AccountCard profile={profile} onEdit={() => setSheet('account')} /> : null}
        {side === 'business' ? <BusinessCard /> : null}

        {side !== 'business' ? (
          <>
            <StatsStrip
              testID="profile-stats"
              stats={[
                { key: 'posts', value: stats.data?.postsCount ?? 0, label: t('profileStats.posts') },
                { key: 'media', value: stats.data?.mediaCount ?? 0, label: t('profileStats.media') },
                { key: 'groups', value: stats.data?.groupsCount ?? 0, label: t('profileStats.groups') },
              ]}
            />
            <UnderlineTabs testID="profile-tabs" value={tab} onChange={setTab} tabs={TABS.map((id) => ({ id, label: t(`profileTabs.${id}`) }))} />
            {tab === 'posts' ? <PostsTab profile={profile} onManageShowcase={() => setSheet('showcase')} onCreatePost={() => setSheet('post')} /> : null}
            {tab === 'about' ? <AboutTab profile={profile} onEditAbout={() => setSheet('about')} /> : null}
            {tab === 'media' ? <MediaTab profile={profile} /> : null}
            {tab === 'groups' ? <GroupsTab profile={profile} /> : null}
          </>
        ) : null}
      </ScrollView>

      <IdentitySheet open={sheet === 'identity'} onClose={close} profile={profile} />
      <AboutSheet open={sheet === 'about'} onClose={close} profile={profile} />
      <AccountSheet open={sheet === 'account'} onClose={close} profile={profile} />
      <BottomSheet open={sheet === 'showcase'} onClose={close} title={t('profile.autopilot.editHighlights')} testID="showcase-sheet">
        <Text muted>{t('profile.autopilot.highlightsDesc')}</Text>
        <Button variant="outline" onPress={close} testID="showcase-sheet-close">
          {t('screens.profile.cancel')}
        </Button>
      </BottomSheet>
      <MobileCreatePostSheet open={sheet === 'post'} onClose={close} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 128 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
});
