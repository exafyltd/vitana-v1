/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) —
 * `/health/plans` (HEALTH.PLANS and the `?tab=` rows nutrition / exercise /
 * hydration / sleep / mental), twin of the phone branch of
 * `src/pages/health/Plans.tsx:190-383`: the health sub-navigation, the 🎯
 * header, the Generate New Plan button, the All Plans / Nutrition / Exercise
 * / Hydration / Sleep / Mental split bar (`useUrlTab("tab", "all")`; the
 * untriggered `supplement` pane, Plans.tsx:360-368, is reachable by link) and
 * the panes.
 *
 * READS ONLY (plan decision 3a): the screen reads `user_health_plans`
 * through the native `useHealthPlans` and never writes. Generate New Plan
 * opens the PlanGeneratorWizard → `generate-personalized-plan` on the web
 * (Plans.tsx:213-223, 373-380); here it is shown disabled and the wizard is
 * not ported. Not ported either: the ExpandableSearchButton (no search
 * handler, Plans.tsx:212), as on /memory.
 */
import { StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { HealthIcon } from '../../ports/health-plans';
import { useI18n } from '../../i18n/I18nProvider';
import { HealthScaffold, SplitBar, StandardHeader, UtilityRow, useUrlTab } from './plans-services/components';
import { AllPlans, PersonalizedPlanCard } from './plans-services/plans/AllPlans';
import { ExercisePlanView, HydrationPlanView, MentalPlanView, NutritionPlanView, SleepPlanView } from './plans-services/plans/views';

const TRIGGERS = ['all', 'nutrition', 'exercise', 'hydration', 'sleep', 'mental'] as const;
const TABS = [...TRIGGERS, 'supplement'] as const;
type Tab = (typeof TABS)[number];

const LABEL_KEY: Record<(typeof TRIGGERS)[number], string> = {
  all: 'screens.health.allPlans',
  nutrition: 'screens.health.nutrition',
  exercise: 'screens.health.exercise',
  hydration: 'screens.health.hydration',
  sleep: 'screens.health.sleep',
  mental: 'screens.health.mental',
};

/** Plan decision 3a: the generator (edge function) and the adherence writes are not wired in the native twin. */
export const PLANS_READS_ONLY = true;

export function PlansScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [tab, setTab] = useUrlTab<Tab>(TABS, 'all');

  return (
    <HealthScaffold activePath="/health/plans" testID="screen-health-plans">
      <StandardHeader emoji="🎯" title={t('screens.health.yourPersonalizedHealthPlans')} description={t('healthNative.plans.description')} />
      <UtilityRow>
        <Button size="sm" disabled={PLANS_READS_ONLY} accessibilityState={{ disabled: PLANS_READS_ONLY }} testID="health-plans-generate-new">
          <View style={styles.row}>
            <HealthIcon name="Plus" size={16} color={colors.primaryForeground} />
            <Text size="sm" weight="500" color={colors.primaryForeground}>
              {t('screens.health.generateNewPlan')}
            </Text>
          </View>
        </Button>
      </UtilityRow>
      <SplitBar testID="health-plans-tab" value={tab} onChange={setTab} items={TRIGGERS.map((v) => ({ value: v, label: t(LABEL_KEY[v]) }))} />
      {tab === 'all' ? (
        <AllPlans />
      ) : tab === 'nutrition' ? (
        <NutritionPlanView />
      ) : tab === 'exercise' ? (
        <ExercisePlanView />
      ) : tab === 'hydration' ? (
        <HydrationPlanView />
      ) : tab === 'sleep' ? (
        <SleepPlanView />
      ) : tab === 'mental' ? (
        <MentalPlanView />
      ) : (
        <PersonalizedPlanCard type="supplement" />
      )}
    </HealthScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
