/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings`, the native twin of
 * the mobile-web settings hub `src/pages/MobileSettings.tsx` (the
 * `SettingsRouter` isMobile branch, `src/App.tsx:689-692`). One screen whose
 * `mode` search param selects the section, with the same `switch` as the web
 * (`VALID_SECTIONS` :39-44 — notifications; privacy / .visibility / .data /
 * .security; preferences / .appearance / .language; billing / .plan /
 * .payment / .invoices / .creator), so the 14 `/settings` ledger rows
 * (`SETTINGS.OVERVIEW` + 13 `?mode=` variants) are this one file. An unknown
 * or missing mode falls back to notifications; a bare parent renders its
 * first child; a later `?mode=` change is honoured and then cleared (web
 * :63-75). The section picker is the shell's `MobileModePill` with the web's
 * mode tree; "Delete account" always sits at the bottom and opens
 * `/delete-account` (the `delete-account` lane's screen).
 *
 * Documented deferrals (the same call the home lane made, VTID-05297): the
 * web utility bar around the pill (`ExpandableSearchButton` — its query is
 * never read on this page —, `VitanaIndexChip`, `AutopilotChip` +
 * `AutopilotPopup`, `UniversalCalendarButton`) belongs to other lanes and the
 * shell exposes no native twin yet, so only the pill is rendered.
 *
 * ORB: the screen registers `vitana:settings-navigate` on the native overlay
 * bus while mounted (web `useWindowOverlay`, :116-128), so a voice "open
 * privacy security" jumps to that section with the same toast. The
 * `vitana:settings-toggle` event (Vitana flipping a notification switch) is
 * not registered: with no listener the ORB reports `native_overlay_not_ported`
 * instead of claiming a change it did not make. React 19 `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableRow, Text, useUITheme } from '../../ports/ui';
import { SettingsIcon, notifySuccess } from '../../ports/settings-ui';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useBusEvent } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { VALID_SECTIONS, contentSection, firstParam, initialSection, isBillingSection } from './sections';
import { NotificationsSection } from './sections/NotificationsSection';
import { PrivacyDataSection, PrivacySecuritySection, PrivacyVisibilitySection } from './sections/PrivacySections';
import { AppearanceSection, LanguageSection } from './sections/PreferencesSections';
import { BillingSectionView } from './sections/BillingSection';

export function useSettingsModes(): ModeOption[] {
  const { t } = useI18n();
  return [
    { value: 'notifications', label: t('screens.mobilesettings.modeNotifications') },
    {
      value: 'privacy',
      label: t('screens.mobilesettings.modePrivacy'),
      children: [
        { value: 'privacy.visibility', label: t('screens.mobilesettings.modePrivacyVisibility') },
        { value: 'privacy.data', label: t('screens.mobilesettings.modePrivacyData') },
        { value: 'privacy.security', label: t('screens.mobilesettings.modePrivacySecurity') },
      ],
    },
    {
      value: 'preferences',
      label: t('screens.mobilesettings.modePreferences'),
      children: [
        { value: 'preferences.appearance', label: t('screens.mobilesettings.modePreferencesAppearance') },
        { value: 'preferences.language', label: t('screens.mobilesettings.modePreferencesLanguage') },
      ],
    },
    {
      value: 'billing',
      label: t('screens.mobilesettings.modeBilling'),
      children: [
        { value: 'billing.plan', label: t('screens.mobilesettings.modeBillingPlan') },
        { value: 'billing.payment', label: t('screens.mobilesettings.modeBillingPayment') },
        { value: 'billing.invoices', label: t('screens.mobilesettings.modeBillingInvoices') },
        { value: 'billing.creator', label: t('screens.mobilesettings.modeBillingCreator') },
      ],
    },
  ];
}

function SectionContent({ active, onNavigate }: { active: string; onNavigate: (s: string) => void }): ReactElement | null {
  const section = contentSection(active);
  switch (section) {
    case 'notifications':
      return <NotificationsSection />;
    case 'privacy.visibility':
      return <PrivacyVisibilitySection />;
    case 'privacy.data':
      return <PrivacyDataSection />;
    case 'privacy.security':
      return <PrivacySecuritySection />;
    case 'preferences.appearance':
      return <AppearanceSection />;
    case 'preferences.language':
      return <LanguageSection />;
    default:
      return isBillingSection(section) ? <BillingSectionView section={section} onNavigateChild={onNavigate} /> : null;
  }
}

export function SettingsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const modeParam = firstParam(params.mode);
  const [active, setActive] = useState(() => initialSection(modeParam));
  const modes = useSettingsModes();

  // Honour a later ?mode= (e.g. back from the storefront to /settings?mode=billing), then clear it
  // so the pill is never locked to the param (MobileSettings.tsx:63-75).
  useEffect(() => {
    if (modeParam && VALID_SECTIONS.has(modeParam)) {
      setActive(modeParam);
      router.setParams({ mode: undefined } as never);
    }
  }, [modeParam]);

  useBusEvent<{ section?: string }>('vitana:settings-navigate', (detail) => {
    const section = String(detail?.section || '');
    if (!VALID_SECTIONS.has(section)) return;
    setActive(section);
    const label = modes.find((m) => m.value === section.split('.')[0])?.label || section;
    notifySuccess('settings.vitanaOpenedSection', undefined, { section: label });
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-settings">
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {t('settings.title')}
        </Text>
        <Text size="sm" muted>
          {t('settings.description')}
        </Text>
      </View>
      <View style={styles.pillRow}>
        <MobileModePill modes={modes} activeMode={active} onModeChange={setActive} title={t('settings.title')} />
      </View>
      <ScrollView contentContainerStyle={styles.content} testID="settings-scroll" keyboardShouldPersistTaps="handled">
        <View testID={`settings-section-${contentSection(active)}`} style={styles.sections}>
          <SectionContent active={active} onNavigate={setActive} />
        </View>
        <View style={styles.deleteWrap}>
          <PressableRow
            onPress={() => navigateToWebPath('/delete-account')}
            accessibilityLabel={t('screens.mobilesettings.deleteAccount')}
            testID="settings-delete-account"
            style={[styles.deleteRow, { borderColor: colors.destructive, backgroundColor: colors.background }]}
          >
            <View style={[styles.deleteIcon, { backgroundColor: colors.muted }]}>
              <SettingsIcon name="Trash2" size={18} color={colors.destructive} />
            </View>
            <View style={styles.fill}>
              <Text size="sm" weight="500" color={colors.destructive}>
                {t('screens.mobilesettings.deleteAccount')}
              </Text>
              <Text size="xs" color={colors.destructive} style={styles.deleteHint}>
                {t('screens.mobilesettings.permanentlyRemoveYourAccountData')}
              </Text>
            </View>
            <SettingsIcon name="ChevronRight" size={16} color={colors.destructive} />
          </PressableRow>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  pillRow: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row' },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  sections: { gap: 12 },
  deleteWrap: { paddingTop: 16 },
  deleteRow: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  deleteIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1, minWidth: 0 },
  deleteHint: { marginTop: 2, opacity: 0.6 },
});
