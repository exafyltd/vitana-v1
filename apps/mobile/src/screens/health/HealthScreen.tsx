/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the native Health
 * dashboard, a 1:1 port of the mobile-web (`useIsMobile`) branch of
 * `src/pages/Health.tsx` (:284-436). One route for three ledger rows: the
 * `mode` search param picks the `MobileModePill` mode — `overview`
 * (HEALTH.OVERVIEW, default), `medical` (HEALTH.MEDICAL) or `supplements`
 * (HEALTH.SUPPLEMENTS) — through the same alias table as the web
 * `normalizeHealthMode` (:105-122); a mode change writes `?mode=` back
 * (`router.setParams`, web `setSearchParams(…, { replace: true })`).
 * The Vitana Index overlay (OVERLAY.VITANA_INDEX) is mounted here and opens
 * from the snapshot, the Index chip or the ORB.
 *
 * Overview: the snapshot (Index, "Top X%" standing, trend, tier, pillars),
 * the pillar agents panel, the priority focus (weakest pillar), the
 * Autopilot guidance ("Action" opens the Health Actions popup) and "View My
 * Journey". Header: the StandardHeader twin (🌱, title, subtitle). Utility
 * bar: mode pill, Upload, the Vitana Index chip and the Autopilot chip.
 *
 * Documented deferrals (file:line evidence in docs/validation/VTID-05455/verification.md):
 *  - the utility bar's ExpandableSearchButton only stores a query nothing on
 *    the page reads (Health.tsx:316), and the Life Compass / Gift Voucher /
 *    Universal Calendar buttons are other lanes' surfaces with no native
 *    twin yet (utility-action-button.tsx:26-27, :116; Health.tsx:322) — the same
 *    deferral the home and diary lanes recorded;
 *  - `VitanaBaselineSurveyModal` (Health.tsx:288) auto-opens a survey whose
 *    submit writes the member's baseline (a health-data write) — not ported;
 *  - the Autopilot popup (Health.tsx:408-411) is the journey-autopilot lane's
 *    surface: the chip opens it over the overlay bus when that lane has
 *    registered it, else navigates to /autopilot (events.ts);
 *  - `completeBySourceRef('onboarding_health')` (Health.tsx:129) is a
 *    gateway write — not called.
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text, useUITheme } from '../../ports/ui';
import { HealthButtonIcon, HealthIcon, withAlpha } from '../../ports/health';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useAuth } from '../../auth/AuthProvider';
import { useHealthText } from './text';
import { useVitanaIndex, weakestPillar, type VitanaIndexPillars } from './data/vitana-index';
import { useProfileHealthSummary } from './data/records';
import { useAutopilotPending } from './data/gateway';
import { MobileAutopilotGuidance, MobileHealthSnapshot, MobilePriorityFocus, VitanaPillarAgentsPanel } from './widgets';
import { MobileHealthMedicalTab } from './MobileHealthMedicalTab';
import { MobileHealthSupplementsTab } from './MobileHealthSupplementsTab';
import { AutopilotChip, VitanaIndexChip } from './MobileActionChips';
import { HealthMasterActionPopup, HealthReportUploadSheet, QuickLabOrderSheet } from './sheets';
import { VitanaIndexSheet } from './VitanaIndexSheet';
import { openAutopilot, openVitanaIndex } from './events';

export type HealthMode = 'overview' | 'medical' | 'supplements';

/** Health.tsx:105-116 HEALTH_MODE_ALIASES. */
const HEALTH_MODE_ALIASES: Record<string, HealthMode> = {
  overview: 'overview',
  health: 'overview',
  medical: 'medical',
  records: 'medical',
  reports: 'medical',
  labs: 'medical',
  supplements: 'supplements',
  supplement: 'supplements',
  stack: 'supplements',
  vitamins: 'supplements',
};

/** Health.tsx:118-122 normalizeHealthMode. */
export function normalizeHealthMode(value: unknown): HealthMode | null {
  if (typeof value !== 'string' || !value) return null;
  return HEALTH_MODE_ALIASES[value.trim().toLowerCase().replace(/[\s_-]+/g, '')] ?? HEALTH_MODE_ALIASES[value.trim().toLowerCase()] ?? null;
}

/** Health.tsx:210-216 pillarEmojis (the priority focus uses these, not the snapshot's). */
const FOCUS_EMOJI: Record<string, string> = { nutrition: '🥗', exercise: '🏃', sleep: '😴', hydration: '💧', mental: '🧠' };

const ZERO_PILLARS: VitanaIndexPillars = { nutrition: 0, hydration: 0, exercise: 0, sleep: 0, mental: 0 };

export function HealthScreen(): ReactElement {
  const { colors } = useUITheme();
  const { t, rtl, healthPillarLabel } = useHealthText();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user } = useAuth();
  const [mode, setMode] = useState<HealthMode>(() => normalizeHealthMode(params.mode) ?? 'overview');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    const next = normalizeHealthMode(params.mode);
    if (next) setMode(next);
  }, [params.mode]);

  const changeMode = (value: string) => {
    const next = normalizeHealthMode(value) ?? 'overview';
    setMode(next);
    router.setParams({ mode: next });
  };

  const { index } = useVitanaIndex();
  const { data: summary } = useProfileHealthSummary(user?.id);
  const { pendingCount } = useAutopilotPending();
  const topPercent = summary?.standing?.available ? (summary.standing.topPercent ?? undefined) : undefined;

  const livePillars = index?.pillars ?? ZERO_PILLARS;
  const weakestKey = weakestPillar(livePillars);
  const weakestPercent = Math.round((livePillars[weakestKey] / 200) * 100);

  const modes: ModeOption[] = [
    { value: 'overview', label: t('health.overview'), icon: '🏠' },
    { value: 'medical', label: t('health.medical'), icon: '🏥' },
    { value: 'supplements', label: t('health.supplements'), icon: '💊' },
  ];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView testID="screen-health" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            🌱
          </Text>
          <View style={styles.fill}>
            <Text variant="title" accessibilityRole="header">
              {t('health.title')}
            </Text>
            <Text muted>{t('healthNative.subtitle')}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar} testID="health-utility-bar">
          <MobileModePill modes={modes} activeMode={mode} onModeChange={changeMode} title={t('healthNative.selectMode')} />
          <Button testID="health-upload-button" variant="ghost" size="sm" onPress={() => setUploadOpen(true)} style={[styles.upload, { backgroundColor: withAlpha(colors.statusSuccess, 0.6) }]}>
            <HealthButtonIcon name="Plus" />
            {t('healthNative.upload')}
          </Button>
          <VitanaIndexChip />
          <AutopilotChip pendingCount={pendingCount} onPress={openAutopilot} />
        </ScrollView>

        {mode === 'overview' ? (
          <View style={styles.section} testID="health-overview">
            <Pressable testID="health-snapshot" accessibilityRole="button" accessibilityLabel={t('screens.health.openVitanaIndexForecast')} onPress={openVitanaIndex}>
              <MobileHealthSnapshot vitanaIndex={index?.total ?? 0} vitanaPercentile={topPercent} trend={index?.trend ?? 'stable'} pillars={livePillars} />
            </Pressable>
            <View style={styles.px}>
              <VitanaPillarAgentsPanel />
            </View>
            <MobilePriorityFocus
              pillarName={healthPillarLabel(weakestKey)}
              pillarScore={weakestPercent}
              pillarEmoji={FOCUS_EMOJI[weakestKey]}
              explanation={t('health.priorityFocusExplanation')}
            />
            <MobileAutopilotGuidance
              suggestions={[t('health.suggestions.uploadBloodTestResults'), t('health.suggestions.startFitnessChallenge')]}
              onTakeAction={() => setActionsOpen(true)}
            />
            <View style={styles.px}>
              <Button testID="health-view-journey" variant="ghost" size="sm" onPress={() => navigateToWebPath('/autopilot')}>
                {t('screens.health.viewMyJourney')}
                <View style={rtl ? styles.flip : undefined}>
                  <HealthIcon name="ChevronRight" size={16} color={colors.foreground} />
                </View>
              </Button>
            </View>
          </View>
        ) : null}

        {mode === 'medical' ? (
          <View testID="health-medical">
            <MobileHealthMedicalTab onUpload={() => setUploadOpen(true)} />
          </View>
        ) : null}

        {mode === 'supplements' ? (
          <View testID="health-supplements">
            <MobileHealthSupplementsTab />
          </View>
        ) : null}
      </ScrollView>

      <HealthMasterActionPopup open={actionsOpen} onOpenChange={setActionsOpen} onUploadOpen={() => setUploadOpen(true)} onOrderOpen={() => setOrderOpen(true)} />
      <HealthReportUploadSheet open={uploadOpen} onOpenChange={setUploadOpen} />
      <QuickLabOrderSheet open={orderOpen} onOpenChange={setOrderOpen} />
      <VitanaIndexSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { paddingBottom: 128 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  emoji: { fontSize: 28, lineHeight: 34 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  upload: { height: 36, borderRadius: 999, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { gap: 16 },
  px: { paddingHorizontal: 16 },
  flip: { transform: [{ scaleX: -1 }] },
});
