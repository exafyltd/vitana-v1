/**
 * VTID-05429 (Native Wave 2, profile lane) — native twin of the web
 * `/profile/me/privacy` (`src/pages/PrivacySettings.tsx`, the phone /
 * flag-off branch; ledger row PROFILE.PRIVACY).
 *
 * A back header, the intro line, then one card per section (dance
 * preferences, partner preferences, service offerings, my posts, age band):
 * a "Whole section" row and its sub-field rows, each with a tier badge that
 * cycles Private → Connections → Public on tap and writes the merged
 * `profiles.account_visibility` map (web `setFieldVisibility`). Under "My
 * posts" the partner-search row is shown read-only, always Private. The web
 * hardcodes the section copy in English; natively it comes from the
 * `profileNative.privacy.*` catalog (DE first, 11 locales). Tests assert the
 * built request on the client double; no real write fires. React 19:
 * `ReactElement`.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Icon, PressableRow, Spinner, Text, useUITheme } from '../../ports/ui';
import type { AccountFieldKey } from '../../ports/profile';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { SectionCard, TierBadge } from './components';
import { tierFor, useMyProfile } from './data/profile';
import { useVisibilityCycle } from './useVisibilityCycle';

type SectionKey = 'dancePreferences' | 'partnerPreferences' | 'serviceOfferings' | 'myPosts' | 'derivedAgeBand';

/** Web `SECTIONS` — same order, same keys; labels are catalog keys under `profileNative.privacy.fields`. */
export const PRIVACY_SECTIONS: readonly { key: SectionKey; icon: string; subFields: readonly { key: AccountFieldKey; label: string }[] }[] = [
  {
    key: 'dancePreferences',
    icon: 'Zap',
    subFields: [
      { key: 'dancePreferences.varieties', label: 'danceVarieties' },
      { key: 'dancePreferences.level', label: 'danceLevel' },
      { key: 'dancePreferences.lookingFor', label: 'danceLookingFor' },
    ],
  },
  {
    key: 'partnerPreferences',
    icon: 'Heart',
    subFields: [
      { key: 'partnerPreferences.gender', label: 'partnerGender' },
      { key: 'partnerPreferences.ageRange', label: 'partnerAgeRange' },
      { key: 'partnerPreferences.relationshipIntent', label: 'partnerRelationshipIntent' },
      { key: 'partnerPreferences.locationRadius', label: 'partnerLocationRadius' },
    ],
  },
  { key: 'serviceOfferings', icon: 'Briefcase', subFields: [{ key: 'serviceOfferings.priceRange', label: 'servicePriceRange' }] },
  { key: 'myPosts', icon: 'FileText', subFields: [{ key: 'myPosts.commercial', label: 'postsCommercial' }] },
  { key: 'derivedAgeBand', icon: 'Calendar', subFields: [] },
];

function Row({
  label,
  note,
  indent,
  children,
}: {
  label: string;
  note?: string;
  indent?: boolean;
  children: ReactElement;
}): ReactElement {
  return (
    <View style={[styles.row, indent ? styles.indent : null]}>
      <View style={styles.fill}>
        <Text numberOfLines={2}>{label}</Text>
        {note ? (
          <Text variant="caption" muted>
            {note}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function PrivacyScreen(): ReactElement {
  const { t, rtl } = useI18n();
  const { colors } = useUITheme();
  const { user, loading: authLoading } = useAuth();
  const back = () => {
    if (router.canGoBack()) router.back();
    else navigateToWebPath('/me/profile', { replace: true });
  };
  const query = useMyProfile();
  const profile = query.data;
  const { cycle } = useVisibilityCycle(profile, {
    errorKey: 'toasts.privacysettings.couldNotSave',
    announce: (key, next) => ({ field: labelOf(key), tier: t(`profile.account.visibility.${next}`) }),
  });

  const fieldLabels = new Map<AccountFieldKey, string>();
  for (const s of PRIVACY_SECTIONS) {
    fieldLabels.set(s.key, t(`profileNative.privacy.sections.${s.key}.label`));
    for (const sf of s.subFields) fieldLabels.set(sf.key, t(`profileNative.privacy.fields.${sf.label}`));
  }
  function labelOf(key: AccountFieldKey): string {
    return fieldLabels.get(key) ?? key;
  }

  const header = (
    <View style={styles.header}>
      <PressableRow onPress={back} accessibilityLabel={t('screens.privacysettings.back')} testID="privacy-back">
        {/* A chevron pointing toward the inline start edge (flips with the layout direction). */}
        <View style={{ transform: [{ scaleX: rtl ? 1 : -1 }] }}>
          <Icon name="ChevronRight" size={22} />
        </View>
      </PressableRow>
      <Text variant="title" accessibilityRole="header">
        {t('screens.privacysettings.privacyVisibility')}
      </Text>
    </View>
  );

  if (!user && !authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="privacy-signed-out">
        <Text muted style={styles.centerText}>
          {t('screens.privacysettings.pleaseSignManageYourPrivacySettings')}
        </Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="privacy-error">
        <Text weight="600">{t('screens.profile.unableLoadProfile')}</Text>
        <Button variant="outline" onPress={() => void query.refetch()} testID="privacy-retry">
          {t('common.retry')}
        </Button>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]} testID="privacy-loading">
        <Spinner accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  const badge = (key: AccountFieldKey, label: string) => {
    const tier = tierFor(profile.account.visibility, key);
    const tierLabel = t(`profile.account.visibility.${tier}`);
    return (
      <TierBadge
        tier={tier}
        label={tierLabel}
        accessibilityLabel={`${label}: ${t('profile.account.visibilityToggle', { label: tierLabel })}`}
        onPress={() => cycle(key)}
        testID={`privacy-tier-${key}`}
      />
    );
  };

  return (
    <ScrollView testID="screen-privacy" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.scroll}>
      {header}
      <Text variant="caption" muted>
        {t('screens.privacysettings.tapAnyTierBadgeCyclePrivate').replace(/\s*\n\s*/g, ' ')}
      </Text>
      {PRIVACY_SECTIONS.map((section) => (
        <SectionCard
          key={section.key}
          title={t(`profileNative.privacy.sections.${section.key}.label`)}
          subtitle={t(`profileNative.privacy.sections.${section.key}.description`)}
          testID={`privacy-section-${section.key}`}
        >
          <Row label={t('profileNative.privacy.wholeSection')}>{badge(section.key, labelOf(section.key))}</Row>
          {section.subFields.map((sf) => (
            <Row key={sf.key} label={labelOf(sf.key)} indent>
              {badge(sf.key, labelOf(sf.key))}
            </Row>
          ))}
          {section.key === 'myPosts' ? (
            <Row label={t('profileNative.privacy.fields.postsPartnerSeek')} note={t('profileNative.privacy.partnerSeekNote')} indent>
              <TierBadge
                tier="private"
                label={t('profile.account.visibility.private')}
                accessibilityLabel={t('profileNative.privacy.partnerSeekNote')}
                onPress={() => undefined}
                disabled
                testID="privacy-tier-myPosts.partnerSeek"
              />
            </Row>
          ) : null}
        </SectionCard>
      ))}
      <Text variant="caption" muted style={styles.centerText}>
        {t('screens.privacysettings.serverEnforcesTheseTiersEveryCrossuser')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 128 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  indent: { paddingStart: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerText: { textAlign: 'center' },
});
