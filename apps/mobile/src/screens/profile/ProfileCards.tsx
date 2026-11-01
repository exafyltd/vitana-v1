/**
 * VTID-05429 (Native Wave 2, profile lane) — the four segments of the web
 * `MobileIdCardSwitcher` on the member's own `/me/profile`:
 *
 *   IdentityCard  ← `MobileIdentityCard` (avatar, name, @handle, archetype,
 *                   follower counts, Vitana Index, Edit profile + Share)
 *   SocialCard    ← `MobileIdCardBack` (social presence; edit opens About)
 *   AccountCard   ← `MobileAccountCard` (personal data vault, per-field
 *                   visibility tier that cycles on tap)
 *   BusinessCard  ← `MobileBusinessCard` (my recommendations from Discover)
 *
 * Mobile-web branch only, composed from the ports layer, RTL-safe. React 19:
 * `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Avatar, Button, IconButton, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import type { AccountFieldKey } from '../../ports/profile';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { SectionCard, TierBadge } from './components';
import { SOCIAL_PLATFORMS, tierFor, useFollowCounts, useLatestVitanaIndex, useMyRecommendations, type MyProfile } from './data/profile';
import { useVisibilityCycle } from './useVisibilityCycle';

/** Upper bound of the Vitana Index scale (web `VITANA_INDEX_MAX`). */
export const VITANA_INDEX_MAX = 999;

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'U'
  );
}

export function IdentityCard({
  profile,
  onEditIdentity,
  onShare,
}: {
  profile: MyProfile;
  onEditIdentity: () => void;
  /** Undefined when no share URL can be built (no web base URL in this build profile). */
  onShare?: () => void;
}): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const follow = useFollowCounts(profile.userId);
  const index = useLatestVitanaIndex(profile.userId);
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);

  return (
    <SectionCard testID="profile-identity-card">
      <View style={styles.identityRow}>
        <Avatar uri={profile.avatarUrl} fallback={initialsOf(profile.displayName)} size={88} />
        <View style={styles.fill}>
          <Text variant="title" numberOfLines={2} testID="profile-display-name">
            {profile.displayName}
          </Text>
          {profile.handle ? (
            <Text muted numberOfLines={1}>
              {t('profileNative.handle', { handle: profile.handle })}
            </Text>
          ) : null}
          {profile.longevityArchetype ? (
            <Text variant="caption" color={colors.primary} numberOfLines={1}>
              {profile.longevityArchetype}
            </Text>
          ) : null}
          <View style={styles.followRow}>
            <Text variant="caption" muted testID="profile-followers">
              {`${fmt(follow.data?.followers ?? 0)} ${t('profileStats.followers')}`}
            </Text>
            <Text variant="caption" muted testID="profile-following">
              {`${fmt(follow.data?.following ?? 0)} ${t('profileStats.following')}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <View style={styles.fill}>
          <Button onPress={onEditIdentity} testID="profile-edit-identity">
            {t('profile.indexHero.editProfile')}
          </Button>
        </View>
        {onShare ? (
          <View style={styles.fill}>
            <Button variant="outline" onPress={onShare} accessibilityLabel={t('profile.indexHero.shareProfileAria')} testID="profile-share">
              {t('share.shareProfile')}
            </Button>
          </View>
        ) : null}
      </View>

      <View style={[styles.indexBox, { backgroundColor: colors.muted }]} testID="profile-vitana-index">
        <Text variant="label" muted>
          {t('profile.identity.vitanaIndex')}
        </Text>
        {index.isLoading ? (
          <Spinner />
        ) : typeof index.data === 'number' ? (
          <View style={styles.scoreRow}>
            <Text variant="title" testID="profile-vitana-index-score">
              {fmt(index.data)}
            </Text>
            <Text variant="caption" muted>
              {t('profile.indexHero.ofMax', { max: fmt(VITANA_INDEX_MAX) })}
            </Text>
          </View>
        ) : (
          <Text variant="caption" muted testID="profile-vitana-index-empty">
            {t('profile.indexHero.noIndexOwner')}
          </Text>
        )}
      </View>
    </SectionCard>
  );
}

export function SocialCard({ profile, onEdit }: { profile: MyProfile; onEdit: () => void }): ReactElement {
  const { t } = useI18n();
  const linked = SOCIAL_PLATFORMS.filter((p) => profile.social[p]);
  return (
    <SectionCard
      title={t('socialImport.socialPresence')}
      subtitle={t('socialImport.verifiedConnections')}
      action={<IconButton name="Settings2" onPress={onEdit} accessibilityLabel={t('profileEditor.editAbout')} testID="profile-edit-social" />}
      testID="profile-social-card"
    >
      {profile.bio ? <Text muted>{profile.bio}</Text> : null}
      {linked.length === 0 ? (
        <Text variant="caption" muted testID="profile-social-empty">
          {t('socialImport.noAccountsConnected')}
        </Text>
      ) : null}
      {SOCIAL_PLATFORMS.map((p) => {
        const url = profile.social[p];
        return (
          <PressableRow
            key={p}
            disabled={!url}
            onPress={() => {
              if (url) void Linking.openURL(url);
            }}
            accessibilityLabel={t(`profileNative.social.${p}`)}
            testID={`profile-social-${p}`}
            style={styles.socialRow}
          >
            <Text weight="600" style={styles.fill}>
              {t(`profileNative.social.${p}`)}
            </Text>
            <Text variant="caption" muted numberOfLines={1}>
              {url ? t('socialImport.tapToVisit') : t('screens.profile.notLinked')}
            </Text>
          </PressableRow>
        );
      })}
    </SectionCard>
  );
}

type AccountFieldDef = { key: AccountFieldKey; labelKey: string; value?: string };

/** Web `useAccountVisibility.formatAccountDate` through the platform Intl (locale-format twin). */
export function formatAccountDate(iso: string | undefined, locale: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

export function AccountCard({ profile, onEdit }: { profile: MyProfile; onEdit: () => void }): ReactElement {
  const { t, locale } = useI18n();
  const a = profile.account;
  const { cycle } = useVisibilityCycle(profile, { errorKey: 'toasts.profile.couldNotUpdateVisibility' });
  const sections: { titleKey: string; subtitleKey?: string; fields: AccountFieldDef[] }[] = [
    {
      titleKey: 'profile.account.sections.publicProfile',
      subtitleKey: 'profile.account.sections.publicProfileSubtitle',
      fields: [
        { key: 'avatarUrl', labelKey: 'profile.account.fields.avatar', value: a.avatarUrl ? t('profile.account.values.uploaded') : undefined },
        { key: 'handle', labelKey: 'profile.account.fields.handle', value: a.handle ? t('profileNative.handle', { handle: a.handle }) : undefined },
        { key: 'longevityArchetype', labelKey: 'profile.account.fields.longevityArchetype', value: a.longevityArchetype },
      ],
    },
    {
      titleKey: 'profile.account.sections.basicInfo',
      subtitleKey: 'profile.account.sections.basicInfoSubtitle',
      fields: [
        { key: 'firstName', labelKey: 'profile.account.fields.firstName', value: a.firstName },
        { key: 'lastName', labelKey: 'profile.account.fields.lastName', value: a.lastName },
        { key: 'dateOfBirth', labelKey: 'profile.account.fields.dateOfBirth', value: formatAccountDate(a.dateOfBirth, locale) },
        { key: 'gender', labelKey: 'profile.account.fields.gender', value: a.gender },
        { key: 'maritalStatus', labelKey: 'profile.account.fields.maritalStatus', value: a.maritalStatus },
      ],
    },
    {
      titleKey: 'profile.account.sections.contactInfo',
      fields: [
        { key: 'email', labelKey: 'profile.account.fields.email', value: a.email },
        { key: 'phone', labelKey: 'profile.account.fields.phone', value: a.phone },
        { key: 'address', labelKey: 'profile.account.fields.address', value: a.address },
        { key: 'country', labelKey: 'profile.account.fields.country', value: a.country },
        { key: 'city', labelKey: 'profile.account.fields.city', value: a.city },
      ],
    },
    {
      titleKey: 'profile.account.sections.accountDetails',
      fields: [
        { key: 'memberSince', labelKey: 'profile.account.fields.memberSince', value: formatAccountDate(a.memberSince, locale) },
        { key: 'accountType', labelKey: 'profile.account.fields.accountType', value: a.accountType },
        {
          key: 'verificationStatus',
          labelKey: 'profile.account.fields.verificationStatus',
          value: a.verificationStatus ? a.verificationStatus.charAt(0).toUpperCase() + a.verificationStatus.slice(1) : undefined,
        },
      ],
    },
  ];

  return (
    <SectionCard
      title={t('screens.profile.personalDataVault')}
      subtitle={t('screens.profile.eachFieldHasValueVisibilityRule')}
      action={<IconButton name="Settings2" onPress={onEdit} accessibilityLabel={t('screens.profile.editAccountDetails')} testID="profile-edit-account" />}
      testID="profile-account-card"
    >
      {sections.map((s) => (
        <View key={s.titleKey} style={styles.accountSection}>
          <Text variant="label">{t(s.titleKey)}</Text>
          {s.subtitleKey ? (
            <Text variant="caption" muted>
              {t(s.subtitleKey)}
            </Text>
          ) : null}
          {s.fields.map((f) => {
            const tier = tierFor(a.visibility, f.key);
            const tierLabel = t(`profile.account.visibility.${tier}`);
            return (
              <View key={f.key} style={styles.accountRow}>
                <View style={styles.fill}>
                  <Text variant="caption" muted>
                    {t(f.labelKey)}
                  </Text>
                  <Text numberOfLines={1}>{f.value ?? t('profile.account.notSet')}</Text>
                </View>
                <TierBadge
                  tier={tier}
                  label={tierLabel}
                  accessibilityLabel={t('profile.account.visibilityToggle', { label: tierLabel })}
                  onPress={() => cycle(f.key)}
                  testID={`account-tier-${f.key}`}
                />
              </View>
            );
          })}
        </View>
      ))}
      <Text variant="caption" muted>
        {t('screens.profile.somePersonalInformationUsedPersonalizeYour2')}
      </Text>
    </SectionCard>
  );
}

export function BusinessCard(): ReactElement {
  const { t, locale } = useI18n();
  const recs = useMyRecommendations(true);
  const items = recs.data ?? [];
  const fmt = (n: number) => new Intl.NumberFormat(locale).format(n);
  return (
    <SectionCard title={t('profile.business.title')} subtitle={t('profile.business.subtitle')} testID="profile-business-card">
      {recs.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <View style={styles.center} testID="profile-business-empty">
          <Text weight="600">{t('profile.business.empty')}</Text>
          <Text variant="caption" muted style={styles.centerText}>
            {t('profile.business.emptyDesc')}
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <PressableRow
            key={item.id}
            onPress={() => navigateToWebPath(`/discover/product/${item.product_id}`)}
            accessibilityLabel={item.product_title ?? t('profile.business.viewProduct')}
            testID={`profile-business-item-${item.id}`}
            style={styles.socialRow}
          >
            <View style={styles.fill}>
              <Text weight="600" numberOfLines={1}>
                {item.product_title ?? ''}
              </Text>
              <Text variant="caption" muted>
                {`${t('profile.business.clicks', { count: fmt(item.click_count) })} · ${t('profile.business.conversions', { count: fmt(item.conversion_count) })}`}
              </Text>
            </View>
          </PressableRow>
        ))
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  followRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  indexBox: { borderRadius: 12, padding: 12, gap: 4 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  socialRow: { paddingVertical: 8 },
  accountSection: { gap: 6 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  center: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  centerText: { textAlign: 'center' },
});
