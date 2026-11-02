/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the "All
 * Plans" tab of `/health/plans` (Plans.tsx:237-312): six
 * `PersonalizedPlanCard`s (nutrition, exercise, hydration, sleep, mental,
 * supplement), the `CrossPlanRelationshipWidget` and the Autopilot summary
 * footer with its three toast buttons.
 *
 * - A card shows the member's plan row of that type, else the web's sample
 *   (`getMockPlan`). With a row it offers View Plan (`/health/plans/<type>`,
 *   which the web has no route for — the native resolver answers not-found the
 *   same way) and Refresh (re-reads `user_health_plans`, toast); without one
 *   the web's Generate Plan opens the PlanGeneratorWizard → the
 *   `generate-personalized-plan` edge function. The reads-only twin shows
 *   Generate Plan disabled and has no wizard (plan decision 3a).
 * - The Vitana Score in the footer and the relationship rows sit inside Radix
 *   tooltips on the web (VitanaScoreTooltip.tsx, CrossPlanRelationshipWidget.tsx:47);
 *   Radix tooltips do not open on touch, so on the phone they are plain text
 *   and the native twin renders no tooltip.
 * - The footer toasts carry the web's English description and action label
 *   (Plans.tsx:46-80) from the `healthNative` catalog.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Text, useUITheme } from '../../../../ports/ui';
import { HealthIcon, calculateAutopilotContext, getMockPlan, toast, useHealthPalette, type PillarSynergy } from '../../../../ports/health-plans';
import { useI18n } from '../../../../i18n/I18nProvider';
import { navigateToWebPath } from '../../../../navigation/navigate';
import { Bar, healthStyles } from '../components';
import { HEALTH_PLANS_KEY, useHealthPlans, type HealthPlanRow } from '../data';
import { PlanCard } from './parts';
import { usePlanSummary } from './text';

export const PLAN_TYPES = ['nutrition', 'exercise', 'hydration', 'sleep', 'mental', 'supplement'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

const PLAN_ICONS: Record<PlanType, string> = {
  nutrition: 'Apple',
  exercise: 'Dumbbell',
  hydration: 'Droplet',
  sleep: 'Moon',
  mental: 'Brain',
  supplement: 'Plus',
};

function usePlanDot(): Record<PlanType, string> {
  const palette = useHealthPalette();
  return { ...palette.pillar, supplement: palette.warning };
}

export function PersonalizedPlanCard({ type }: { type: PlanType }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const qc = useQueryClient();
  const summaryOf = usePlanSummary();
  const dots = usePlanDot();
  const { plans } = useHealthPlans();
  const [refreshing, setRefreshing] = useState(false);

  const realPlan = plans?.find((p) => p.plan_type === type);
  const plan: Pick<HealthPlanRow, 'plan_type' | 'adherence_score' | 'last_updated'> = realPlan ?? getMockPlan(type);
  const summary = summaryOf(plan);
  const planName = t(`healthNative.plans.planName.${type}`);
  const dot = dots[type];

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: HEALTH_PLANS_KEY });
    toast.success(t('healthNative.plans.refreshed', { planName }));
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <PlanCard testID={`health-plan-card-${type}`}>
      <View style={[styles.meta, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text size="xs" weight="500" muted>
          {`${t('screens.health.aiOptimized')} • ${summary.lastUpdated}`}
        </Text>
      </View>
      <View style={healthStyles.row}>
        <View style={[styles.iconBadge, { backgroundColor: colors.muted }]}>
          <HealthIcon name={PLAN_ICONS[type]} size={20} color={dot} />
        </View>
        <Text weight="600">{planName}</Text>
        <Badge variant="outline" style={{ borderColor: dot }}>
          {t('screens.health.active')}
        </Badge>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.muted }]} />
      {[summary.metricsLine, summary.insightLine1].map((line, i) => (
        <View key={i} style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text size="sm" muted style={healthStyles.fill}>
            {line}
          </Text>
        </View>
      ))}
      <View style={[styles.progressRow, { borderColor: colors.border }]}>
        <View style={healthStyles.fill}>
          <View style={healthStyles.between}>
            <Text size="xs" weight="500" muted>
              {t('screens.health.progress')}
            </Text>
            <Text size="sm" weight="600" testID={`health-plan-card-${type}-adherence`}>
              {`${plan.adherence_score}%`}
            </Text>
          </View>
          <Bar percent={plan.adherence_score} fill={colors.mutedForeground} track={colors.muted} />
        </View>
        <Text size="xs" muted style={styles.footer}>
          {summary.footerLine}
        </Text>
      </View>
      {realPlan ? (
        <View style={healthStyles.row}>
          <Button style={healthStyles.fill} onPress={() => navigateToWebPath(`/health/plans/${type}`)} testID={`health-plan-card-${type}-view`}>
            {t('screens.health.viewPlan')}
          </Button>
          <Button variant="outline" size="icon" onPress={refresh} disabled={refreshing} accessibilityLabel={t('screens.health.refreshPlan')} testID={`health-plan-card-${type}-refresh`}>
            <HealthIcon name="RotateCw" size={16} color={colors.mutedForeground} />
          </Button>
        </View>
      ) : (
        <Button disabled accessibilityState={{ disabled: true }} testID={`health-plan-card-${type}-generate`}>
          {t('health.emptyStates.generatePlan')}
        </Button>
      )}
    </PlanCard>
  );
}

function CrossPlanRelationships({ relationships, lastSynced }: { relationships: PillarSynergy[]; lastSynced: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  if (relationships.length === 0) return null;
  const name = (k: string) => t(`healthNative.plans.pillarName.${k}`);
  const tone = (type: PillarSynergy['type']) =>
    type === 'positive'
      ? { bg: palette.successSubtle, fg: palette.success, toBg: palette.hue.purple, toFg: palette.category[3] }
      : type === 'negative'
        ? { bg: palette.warningSubtle, fg: palette.warning, toBg: palette.warningSubtle, toFg: palette.warning }
        : { bg: colors.muted, fg: colors.mutedForeground, toBg: colors.muted, toFg: colors.mutedForeground };
  return (
    <PlanCard testID="health-plans-relationships" tint={palette.surfaceSunken}>
      <View style={healthStyles.row}>
        <HealthIcon name="Link2" size={20} color={palette.category[3]} />
        <Text size="lg" weight="600">
          {t('screens.health.howYourPlansInteract')}
        </Text>
      </View>
      {relationships.map((rel, i) => {
        const c = tone(rel.type);
        return (
          <View key={i} style={[styles.relation, { backgroundColor: c.bg }]} testID={`health-plans-relationship-${i}`}>
            <View style={healthStyles.row}>
              <View style={[styles.pill, { backgroundColor: c.bg }]}>
                <Text size="xs" color={c.fg}>{`${rel.icons.from} ${name(rel.from)}`}</Text>
              </View>
              <Text size="sm" muted>
                →
              </Text>
              <View style={[styles.pill, { backgroundColor: c.toBg }]}>
                <Text size="xs" color={c.toFg}>{`${rel.icons.to} ${name(rel.to)}`}</Text>
              </View>
            </View>
            <Text size="sm" weight="500" color={c.fg}>
              {rel.impact}
            </Text>
          </View>
        );
      })}
      <Text size="xs" muted>
        {t('screens.health.lastSyncedLastsynced', { lastSynced })}
      </Text>
    </PlanCard>
  );
}

export function AllPlans() {
  const { t } = useI18n();
  const { plans, isLoading } = useHealthPlans();
  const auto = calculateAutopilotContext(plans ?? []);

  if (isLoading) {
    return (
      <Text muted style={styles.loading} testID="health-plans-loading">
        {t('screens.health.loadingPlans')}
      </Text>
    );
  }

  const recalibrate = () =>
    toast.info(t('toasts.health.recalibrationStarted'), {
      description: t('healthNative.plans.toasts.recalibrateDescription'),
      action: { label: t('healthNative.plans.toasts.viewProgress'), onClick: () => navigateToWebPath('/health/plans') },
    });
  const report = () =>
    toast.info(t('toasts.health.reportGeneration'), {
      description: t('healthNative.plans.toasts.reportDescription'),
      action: { label: t('healthNative.plans.toasts.gotIt'), onClick: () => undefined },
    });
  const optimize = () => {
    const weakest = plans && plans.length > 0 ? plans.reduce((min, p) => (p.adherence_score < min.adherence_score ? p : min)) : null;
    const pillar = weakest?.plan_type || 'nutrition';
    toast.success(t('healthNative.plans.toasts.optimizing', { pillar: pillar.charAt(0).toUpperCase() + pillar.slice(1) }), {
      description: t('healthNative.plans.toasts.optimizeDescription'),
      action: { label: t('healthNative.plans.toasts.viewPlan'), onClick: () => navigateToWebPath(`/health/plans/${pillar}`) },
    });
  };

  return (
    <View style={healthStyles.list} testID="health-plans-all">
      {PLAN_TYPES.map((type) => (
        <PersonalizedPlanCard key={type} type={type} />
      ))}
      <CrossPlanRelationships relationships={auto.relationships} lastSynced={auto.lastRecalibration} />
      <PlanCard testID="health-plans-autopilot">
        <Text size="lg" weight="600">
          {t('screens.health.autopilotSummary')}
        </Text>
        <Text size="sm" muted>
          <Text size="sm" weight="600" muted>
            {t('screens.health.vitanascoreVitanaScore', { vitanaScore: auto.vitanaScore })}
          </Text>
          {t('screens.health.text5ActivePlansSyncedCrosspillarSynergy', { synergyScore: auto.synergyScore })}
        </Text>
        <Text size="sm" muted>
          {`${t('screens.health.nextRecalibration')} `}
          <Text size="sm" weight="500" muted>
            {auto.nextRecalibration}
          </Text>
          {t('screens.health.adjustmentLastadjustment', { lastAdjustment: auto.lastAdjustment })}
        </Text>
        <View style={healthStyles.wrap}>
          <Button size="sm" variant="pill" onPress={recalibrate} testID="health-plans-recalibrate-all">
            {t('screens.health.recalibrateAll')}
          </Button>
          <Button size="sm" variant="outline" onPress={report} testID="health-plans-view-report">
            {t('screens.health.viewDetailedReport')}
          </Button>
          <Button size="sm" variant="outline" onPress={optimize} testID="health-plans-optimize">
            {t('screens.health.optimizeWeakestPillar')}
          </Button>
        </View>
      </PlanCard>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  iconBadge: { padding: 8, borderRadius: 8 },
  divider: { height: 6, borderRadius: 3 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottomWidth: 1 },
  footer: { maxWidth: '45%' },
  relation: { gap: 8, padding: 12, borderRadius: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  loading: { textAlign: 'center', paddingVertical: 48 },
});
