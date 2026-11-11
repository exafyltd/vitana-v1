/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the five
 * pillar tabs of `/health/plans` (`?tab=nutrition|exercise|hydration|sleep|mental`),
 * twins of `src/components/health/<pillar>/<Pillar>PlanView.tsx`. Each takes
 * the member's active plan of that type from `user_health_plans` (the
 * reads-only `useHealthPlans`) and, like the web, falls back to the web's
 * sample plan (`mock<Pillar>Plan`) when there is none; `isGenerated: false`
 * shows the empty state. The plan content (goal, schedule, workouts, recipes,
 * daily stats, AI notes) is plan data and renders as stored, exactly as the
 * web renders it.
 *
 * Not ported (recorded in docs/validation/VTID-05456/verification.md): the
 * per-item detail overlays the cards open on the web — RecipeSheet + Cook Mode
 * (NutritionPlanView.tsx:98,111), WorkoutModal (ExercisePlanView.tsx:42,54),
 * HydrationModal (HydrationPlanView.tsx:45,63), SleepModal
 * (SleepPlanView.tsx:45,62) and MentalModal (MentalPlanView.tsx:42,64) — so the
 * cards are not pressable here.
 */
import { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Badge, Text, useUITheme } from '../../../../ports/ui';
import {
  HealthIcon,
  mockExercisePlan,
  mockHydrationPlan,
  mockMentalPlan,
  mockNutritionPlan,
  mockSleepPlan,
  useHealthPalette,
  type DailyHydrationData,
  type DailyMentalData,
  type DailySleepData,
  type ExercisePlanData,
  type HydrationPlanData,
  type MentalPlanData,
  type NutritionPlanData,
  type Recipe,
  type SleepPlanData,
  type Workout,
} from '../../../../ports/health-plans';
import { useI18n } from '../../../../i18n/I18nProvider';
import { Bar, SplitBar, healthStyles } from '../components';
import { useHealthPlans } from '../data';
import { AiSummary, OverviewCard, PlanCard, PlanEmptyState, RecoveryImpact, SectionTitle, StatGrid, StatTile } from './parts';
import { useFmtDate } from './text';

function usePlanData<T>(type: string, mock: T): T {
  const { plans } = useHealthPlans();
  const row = plans?.find((p) => p.plan_type === type);
  return ((row?.plan_data as T | undefined) || mock) as T;
}

// ── nutrition ─────────────────────────────────────────────────────────────

const SLOT_ORDER: Record<Recipe['slot'], number> = { breakfast: 0, snack1: 1, lunch: 2, snack2: 3, dinner: 4 };
const MEAL_TABS = ['all', 'breakfast', 'lunch', 'dinner', 'snacks'] as const;
type MealTab = (typeof MEAL_TABS)[number];

/** RecipeCard.tsx:12-18 — the slot photo when the recipe's own image fails. */
const FALLBACK_IMAGES: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&h=900&fit=crop',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=900&fit=crop',
  dinner: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&h=900&fit=crop',
  snack1: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=900&fit=crop',
  snack2: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=900&fit=crop',
};

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [uri, setUri] = useState(recipe.imageUrl);
  return (
    <View style={[styles.mediaCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`health-recipe-${recipe.recipeId}`}>
      <Image
        source={{ uri }}
        accessibilityLabel={recipe.title}
        style={styles.media}
        onError={() => setUri(FALLBACK_IMAGES[recipe.slot] || FALLBACK_IMAGES.lunch)}
      />
      <View style={styles.mediaBody}>
        <Text weight="600" numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={healthStyles.wrap}>
          <Badge variant="secondary">{t('screens.health.caloriesCal', { calories: recipe.calories })}</Badge>
          <Badge variant="secondary">{t('healthNative.plans.proteinShort', { protein: recipe.macros.protein })}</Badge>
          <Badge variant="secondary">{t('screens.health.timeminMin', { timeMin: recipe.prep.timeMin })}</Badge>
        </View>
        {recipe.tags.length > 0 ? (
          <View style={healthStyles.wrap}>
            {recipe.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function NutritionPlanView() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const planData = usePlanData<NutritionPlanData>('nutrition', mockNutritionPlan);
  const [tab, setTab] = useState<MealTab>('all');

  const byDay = useMemo(() => {
    const keep = (m: Recipe) => (tab === 'all' ? true : tab === 'snacks' ? m.slot.includes('snack') : m.slot === tab);
    const out: Array<{ day: number; meals: Recipe[] }> = [];
    for (const d of planData?.days ?? []) {
      const meals = d.meals.filter(keep);
      if (meals.length > 0) out.push({ day: d.day, meals: [...meals].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]) });
    }
    return out;
  }, [planData, tab]);

  if (!planData?.isGenerated) {
    return (
      <PlanEmptyState
        icon="Apple"
        iconColor={palette.success}
        title={t('health.emptyStates.noNutritionPlan')}
        description={t('health.emptyStates.noNutritionPlanDesc')}
        testID="health-plans-nutrition-empty"
      />
    );
  }

  return (
    <View style={healthStyles.list} testID="health-plans-nutrition">
      <OverviewCard
        testID="health-plans-nutrition-overview"
        title={t('screens.health.yourNutritionPlanPoweredByAutopilot')}
        subtitle={t('screens.health.aioptimizedMealGuidanceTailoredYourPreferences')}
        headerIcon={{ name: 'Brain', color: palette.success }}
        tiles={[
          { icon: 'TrendingUp', iconColor: palette.success, label: t('screens.health.goalFocus'), value: planData.goalFocus || t('healthNative.plans.nutritionDefaults.goalFocus') },
          {
            icon: 'Calendar',
            iconColor: palette.category[1],
            label: t('screens.health.schedule'),
            value: planData.schedule || t('healthNative.plans.nutritionDefaults.schedule'),
            sub: planData.caloriesTarget ? t('healthNative.plans.nutritionDefaults.calTarget', { calories: planData.caloriesTarget }) : t('healthNative.plans.nutritionDefaults.daily'),
          },
          {
            icon: 'Clock',
            iconColor: palette.category[2],
            label: t('screens.health.progress'),
            value: t('screens.health.weekValue0Value1', { value0: planData.currentWeek || 1, value1: planData.totalWeeks || 4 }),
            sub: t('screens.health.value0Complete2', { value0: planData.completionPercentage || 0 }),
          },
        ]}
        progressLabel={t('screens.health.trackingYourWeeklyConsistency')}
        percent={planData.completionPercentage || 0}
        percentColor={palette.success}
        insight={planData.aiInsight || t('healthNative.plans.nutritionDefaults.insight')}
        insightIcon={{ name: 'Brain', color: palette.success }}
        lastUpdated={planData.lastUpdated}
      />
      <SplitBar testID="health-plans-meal-tab" value={tab} onChange={setTab} items={MEAL_TABS.map((v) => ({ value: v, label: t(`screens.health.${v}`) }))} />
      {byDay.length === 0 ? (
        <View style={[styles.noMatch, { borderColor: colors.border }]}>
          <Text muted>{t('screens.health.noRecipesMatchYourFilters')}</Text>
        </View>
      ) : (
        byDay.map(({ day, meals }) => (
          <View key={day} style={healthStyles.list} testID={`health-plans-nutrition-day-${day}`}>
            <View style={healthStyles.row}>
              <HealthIcon name="Calendar" size={20} color={colors.primary} />
              <SectionTitle>{t('screens.health.dayDay', { day })}</SectionTitle>
            </View>
            {meals.map((m) => (
              <RecipeCard key={m.recipeId} recipe={m} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

// ── exercise ──────────────────────────────────────────────────────────────

function WorkoutCard({ workout }: { workout: Workout }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const rest = workout.duration === 0;
  const updated = workout.status === 'updated';
  return (
    <View
      style={[styles.mediaCard, { backgroundColor: colors.card, borderColor: updated ? palette.category[3] : colors.border, borderWidth: updated ? 2 : 1 }]}
      testID={`health-workout-${workout.workoutId}`}
    >
      <View>
        <Image source={{ uri: workout.imageUrl }} accessibilityLabel={workout.title} style={styles.media} />
        {updated ? (
          <View style={[styles.mediaChipStart, { backgroundColor: palette.info }]}>
            <HealthIcon name="Brain" size={14} color={colors.primaryForeground} />
            <Text size="xs" weight="500" color={colors.primaryForeground}>
              {t('screens.health.aiUpdated')}
            </Text>
          </View>
        ) : null}
        <View style={styles.mediaChipEnd}>
          <Badge variant="secondary">{workout.day}</Badge>
        </View>
      </View>
      <View style={styles.mediaBody}>
        <Text size="lg" weight="700" numberOfLines={1}>
          {workout.title}
        </Text>
        <View style={healthStyles.wrap}>
          {!rest ? (
            <>
              <View style={healthStyles.row}>
                <HealthIcon name="Clock" size={14} color={colors.mutedForeground} />
                <Text size="xs" weight="500">
                  {t('screens.health.durationMin', { duration: workout.duration })}
                </Text>
              </View>
              <View style={healthStyles.row}>
                <HealthIcon name="Flame" size={14} color={colors.mutedForeground} />
                <Text size="xs" weight="500">
                  {t('screens.health.caloriesburnedKcal', { caloriesBurned: workout.caloriesBurned })}
                </Text>
              </View>
            </>
          ) : null}
          <Badge variant="secondary">{workout.difficulty}</Badge>
        </View>
        <Text size="sm" muted numberOfLines={2}>
          {workout.description}
        </Text>
        {workout.muscleGroups.length > 0 ? (
          <View style={healthStyles.row}>
            <HealthIcon name="Dumbbell" size={14} color={colors.mutedForeground} />
            <Text size="xs" muted style={healthStyles.fill}>
              {workout.muscleGroups.join(', ')}
            </Text>
          </View>
        ) : null}
        {workout.equipment.length > 0 ? (
          <View style={healthStyles.wrap}>
            {workout.equipment.map((eq) => (
              <Badge key={eq} variant="outline">
                {eq.replace('-', ' ')}
              </Badge>
            ))}
          </View>
        ) : null}
        <Badge variant="secondary">{workout.mode}</Badge>
        {workout.aiNote ? (
          <View style={[styles.note, { borderColor: colors.border }]}>
            <HealthIcon name="Brain" size={14} color={palette.category[3]} />
            <Text size="xs" muted style={[healthStyles.fill, styles.italic]}>
              {workout.aiNote}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function ExercisePlanView() {
  const { t } = useI18n();
  const palette = useHealthPalette();
  const planData = usePlanData<ExercisePlanData>('exercise', mockExercisePlan);
  if (!planData?.isGenerated) {
    return (
      <PlanEmptyState
        icon="Dumbbell"
        iconColor={palette.category[3]}
        title={t('health.emptyStates.noExercisePlan')}
        description={t('health.emptyStates.noExercisePlanDesc')}
        testID="health-plans-exercise-empty"
      />
    );
  }
  const p = planData.progress;
  return (
    <View style={healthStyles.list} testID="health-plans-exercise">
      <OverviewCard
        testID="health-plans-exercise-overview"
        title={t('screens.health.yourExercisePlanPoweredByAutopilot')}
        subtitle={t('screens.health.aioptimizedWorkoutsTailoredYourFitnessLevel')}
        headerIcon={{ name: 'Brain', color: palette.category[3] }}
        tiles={[
          { icon: 'TrendingUp', iconColor: palette.category[3], label: t('screens.health.goalFocus'), value: planData.goalFocus },
          {
            icon: 'Calendar',
            iconColor: palette.category[1],
            label: t('screens.health.schedule'),
            value: t('screens.health.sessionsperweekSessionsWeek', { sessionsPerWeek: planData.sessionsPerWeek }),
            sub: t('screens.health.avgDurationAvgdurationMin', { avgDuration: planData.avgDuration }),
          },
          {
            icon: 'Clock',
            iconColor: palette.category[2],
            label: t('screens.health.progress'),
            value: t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks }),
            sub: t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage }),
          },
        ]}
        progressLabel={t('screens.health.weekCurrentweekTotalweeksweekProgram', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks })}
        percent={planData.completionPercentage}
        percentColor={palette.category[3]}
        insight={planData.aiInsight}
        insightIcon={{ name: 'Brain', color: palette.category[3] }}
      />
      <SectionTitle>{t('screens.health.yourWeeklyWorkouts')}</SectionTitle>
      {planData.workouts.map((w) => (
        <WorkoutCard key={w.workoutId} workout={w} />
      ))}
      <PlanCard testID="health-plans-exercise-dashboard">
        <View style={healthStyles.row}>
          <HealthIcon name="TrendingUp" size={20} color={palette.category[3]} />
          <SectionTitle>{t('screens.health.weeklyProgressConsistency')}</SectionTitle>
        </View>
        <StatGrid>
          <StatTile icon="CheckCircle2" iconColor={palette.success} value={`${p.workoutsCompleted}/${p.workoutsTotal}`} label={t('screens.health.workouts')} />
          <StatTile icon="Clock" iconColor={palette.category[3]} value={String(p.avgWorkoutTime)} label={t('screens.health.avgMinutes')} />
          <StatTile icon="Flame" iconColor={palette.warning} value={String(p.totalCaloriesBurned)} label={t('screens.health.calBurned')} />
          <StatTile icon="Heart" iconColor={palette.category[4]} value={`${p.recoveryScore}/100`} label={t('screens.health.recovery')} badge="+5" />
        </StatGrid>
        <AiSummary text={t('healthNative.plans.aiSummary.exercise')} iconColor={palette.success} />
      </PlanCard>
    </View>
  );
}

// ── hydration ─────────────────────────────────────────────────────────────

const liters = (ml: number) => (ml / 1000).toFixed(1);

function DailyHydrationCard({ data }: { data: DailyHydrationData }) {
  const { t } = useI18n();
  const fmtDate = useFmtDate();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const complete = data.completionPercentage >= 100;
  const onTrack = data.completionPercentage >= 80;
  const belowHalf = data.completionPercentage < 50;
  const status = complete ? 'goalMet' : belowHalf ? 'catchUp' : !onTrack ? 'belowTarget' : 'onTrack';
  return (
    <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`health-hydration-day-${data.dayId}`}>
      <View style={healthStyles.between}>
        <View style={healthStyles.row}>
          <Text size="sm" weight="600">
            {data.day}
          </Text>
          <Text size="sm" muted>
            {fmtDate(data.date, { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={healthStyles.row}>
          {data.aiNote ? (
            <View style={[styles.aiChip, { borderColor: colors.border, backgroundColor: palette.surfaceSunken }]}>
              <HealthIcon name="Brain" size={12} color={colors.mutedForeground} />
              <Text size="xs" muted>
                {t('healthNative.plans.ai')}
              </Text>
            </View>
          ) : null}
          <HealthIcon name="Droplets" size={20} color={onTrack ? palette.category[1] : colors.mutedForeground} />
        </View>
      </View>
      {complete || belowHalf ? (
        <View style={[styles.status, { backgroundColor: complete ? palette.successSubtle : palette.warningSubtle }]}>
          {complete ? <HealthIcon name="Sparkles" size={12} color={palette.success} /> : null}
          <Text size="xs" weight="500" color={complete ? palette.success : palette.warning}>
            {t(`healthNative.plans.hydrationStatus.${status}`)}
          </Text>
        </View>
      ) : null}
      <View style={healthStyles.between}>
        <Text size="xs" muted>
          {t('screens.health.intake')}
        </Text>
        <Text size="xs" weight="500" muted>
          {t('healthNative.plans.litersOf', { current: liters(data.currentAmount), target: liters(data.targetAmount) })}
        </Text>
      </View>
      <Bar percent={data.completionPercentage} fill={palette.category[1]} track={colors.muted} />
      <View style={healthStyles.between}>
        <Text size="xs" muted>
          {t('screens.health.completionpercentageComplete', { completionPercentage: data.completionPercentage })}
        </Text>
        {!complete && !belowHalf ? (
          <Text size="xs" muted>
            {t(`healthNative.plans.hydrationStatus.${status}`)}
          </Text>
        ) : null}
      </View>
      <View style={healthStyles.row}>
        <HealthIcon name="Clock" size={14} color={colors.mutedForeground} />
        <Text size="xs" muted>
          {data.nextReminder}
        </Text>
      </View>
      <View style={healthStyles.wrap}>
        {data.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </View>
      {data.aiNote ? (
        <Text size="xs" muted numberOfLines={2}>
          {data.aiNote}
        </Text>
      ) : null}
    </View>
  );
}

export function HydrationPlanView() {
  const { t } = useI18n();
  const palette = useHealthPalette();
  const { colors } = useUITheme();
  const planData = usePlanData<HydrationPlanData>('hydration', mockHydrationPlan);
  if (!planData?.isGenerated) {
    return (
      <PlanEmptyState
        icon="Droplets"
        iconColor={palette.category[1]}
        title={t('health.emptyStates.noHydrationPlan')}
        description={t('health.emptyStates.noHydrationPlanDesc')}
        testID="health-plans-hydration-empty"
      />
    );
  }
  const p = planData.progress;
  const daysCompleted = planData.dailyStats.filter((d) => d.completionPercentage >= 100).length;
  return (
    <View style={healthStyles.list} testID="health-plans-hydration">
      <OverviewCard
        testID="health-plans-hydration-overview"
        title={t('screens.health.yourHydrationPlanPoweredByAutopilot')}
        subtitle={t('screens.health.smartHydrationGuidanceTailoredYourLifestyle')}
        headerIcon={{ name: 'Brain', color: palette.category[1] }}
        tiles={[
          { icon: 'Droplets', iconColor: palette.category[1], label: t('screens.health.goalFocus'), value: planData.goalFocus },
          { icon: 'Clock', iconColor: palette.category[7], label: t('screens.health.schedule'), value: planData.schedule, sub: t('screens.health.value0LDailyTarget', { value0: liters(planData.dailyTargetMl) }) },
          {
            icon: 'Calendar',
            iconColor: palette.category[3],
            label: t('screens.health.progress'),
            value: t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks }),
            sub: t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage }),
          },
        ]}
        progressLabel={t('screens.health.trackingYourWeeklyConsistency')}
        percent={planData.completionPercentage}
        percentColor={palette.category[1]}
        insight={planData.aiInsight}
        insightIcon={{ name: 'Brain', color: palette.category[1] }}
        lastUpdated={planData.lastUpdated}
        helper={t('screens.health.recalibrationAdjustsHydrationGoalsBasedTemperature')}
      />
      <SectionTitle>{t('screens.health.yourDailyHydrationTracking')}</SectionTitle>
      {planData.dailyStats.map((d) => (
        <DailyHydrationCard key={d.dayId} data={d} />
      ))}
      <Text size="sm" muted style={styles.center}>
        {t('screens.health.youVeMetYourHydrationGoal', { daysCompleted, totalDays: planData.dailyStats.length, energyImpact: p.recoveryImpact })}
      </Text>
      <PlanCard testID="health-plans-hydration-dashboard">
        <View style={healthStyles.row}>
          <HealthIcon name="TrendingUp" size={20} color={palette.category[1]} />
          <SectionTitle>{t('screens.health.weeklyProgressConsistency')}</SectionTitle>
        </View>
        <StatGrid>
          <StatTile ring={{ percent: p.consistencyScore, color: palette.category[1] }} label={t('screens.health.consistency')} />
          <StatTile icon="Droplets" iconColor={palette.category[3]} value={t('healthNative.plans.liters', { value: liters(p.avgDailyIntake) })} label={t('screens.health.avgIntake')} badge={`+${p.weeklyTrend}%`} />
          <StatTile icon="Flame" iconColor={palette.warning} value={String(p.streakDays)} label={t('screens.health.dayStreak')} />
          <StatTile icon="CalendarX" iconColor={colors.mutedForeground} value={String(p.missedDays)} label={t('screens.health.missedDays')} />
        </StatGrid>
        <RecoveryImpact value={p.recoveryImpact} helper={t('screens.health.properHydrationBoostingYourEnergyRecovery')} />
        <AiSummary text={t('healthNative.plans.aiSummary.hydration')} iconColor={palette.category[1]} />
      </PlanCard>
    </View>
  );
}

// ── sleep ─────────────────────────────────────────────────────────────────

function DailySleepCard({ data }: { data: DailySleepData }) {
  const { t } = useI18n();
  const fmtDate = useFmtDate();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const excellent = data.sleepScore >= 85;
  const good = data.sleepScore >= 70 && data.sleepScore < 85;
  const status = excellent ? 'excellent' : good ? 'good' : 'improve';
  const border = excellent ? palette.success : good ? palette.info : palette.warning;
  return (
    <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: data.aiNote ? palette.category[3] : border, borderWidth: data.aiNote ? 2 : 1 }]} testID={`health-sleep-day-${data.dayId}`}>
      <View style={healthStyles.between}>
        <View style={healthStyles.fill}>
          <Text weight="600" color={palette.category[3]}>
            {data.day}
          </Text>
          <Text size="xs" muted>
            {fmtDate(data.date, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {data.aiNote ? <Badge variant="secondary">{t('healthNative.plans.ai')}</Badge> : null}
        {excellent ? <Badge style={{ backgroundColor: palette.success }}>{t('screens.health.excellent')}</Badge> : null}
        <HealthIcon name="Moon" size={32} color={excellent ? palette.category[3] : good ? palette.category[2] : colors.mutedForeground} />
      </View>
      <View style={healthStyles.between}>
        <Text size="sm" weight="500">
          {data.duration}
        </Text>
        <Text size="sm" weight="700">
          {t('screens.health.scoreSleepscore100', { sleepScore: data.sleepScore })}
        </Text>
      </View>
      <Bar percent={data.sleepScore} fill={palette.category[3]} track={colors.muted} />
      <Text size="xs" muted>
        {t(`healthNative.plans.sleepStatus.${status}`)}
      </Text>
      <View style={healthStyles.row}>
        <HealthIcon name="Clock" size={14} color={colors.mutedForeground} />
        <Text size="xs" muted>
          {t('screens.health.bedtimeBedtimeWakeWaketime', { bedtime: data.bedtime, wakeTime: data.wakeTime })}
        </Text>
      </View>
      <View style={healthStyles.wrap}>
        {data.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </View>
      {data.aiNote ? (
        <View style={[styles.note, { borderColor: colors.border }]}>
          <HealthIcon name="Brain" size={14} color={palette.category[3]} />
          <Text size="xs" muted style={healthStyles.fill}>
            {data.aiNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function SleepPlanView() {
  const { t } = useI18n();
  const palette = useHealthPalette();
  const planData = usePlanData<SleepPlanData>('sleep', mockSleepPlan);
  if (!planData?.isGenerated) {
    return (
      <PlanEmptyState
        icon="Moon"
        iconColor={palette.category[3]}
        title={t('health.emptyStates.noSleepPlan')}
        description={t('health.emptyStates.noSleepPlanDesc')}
        testID="health-plans-sleep-empty"
      />
    );
  }
  const p = planData.progress;
  const avgScore = Math.round(planData.dailyStats.reduce((sum, d) => sum + d.sleepScore, 0) / planData.dailyStats.length);
  return (
    <View style={healthStyles.list} testID="health-plans-sleep">
      <OverviewCard
        testID="health-plans-sleep-overview"
        title={t('screens.health.yourSleepPlanPoweredByAutopilot')}
        subtitle={t('screens.health.smartSleepGuidanceTunedYourCircadian')}
        headerIcon={{ name: 'Brain', color: palette.category[3] }}
        tiles={[
          { icon: 'Moon', iconColor: palette.category[3], label: t('screens.health.goalFocus'), value: planData.goalFocus },
          { icon: 'Clock', iconColor: palette.category[2], label: t('screens.health.schedule'), value: planData.schedule, sub: t('screens.health.consistentBedtimeTargetbedtime', { targetBedtime: planData.targetBedtime }) },
          {
            icon: 'Calendar',
            iconColor: palette.category[7],
            label: t('screens.health.progress'),
            value: t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks }),
            sub: t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage }),
          },
        ]}
        progressLabel={t('screens.health.trackingYourAverageSleepQualityOver')}
        percent={planData.completionPercentage}
        percentColor={palette.category[3]}
        insight={planData.aiInsight}
        insightIcon={{ name: 'Brain', color: palette.category[3] }}
        lastUpdated={planData.lastUpdated}
        helper={t('screens.health.recalibrationAdjustsYourSleepGoalsBased')}
      />
      <SectionTitle>{t('screens.health.yourDailySleepTracking')}</SectionTitle>
      {planData.dailyStats.map((d) => (
        <DailySleepCard key={d.dayId} data={d} />
      ))}
      <Text size="sm" muted style={styles.center}>
        {t('screens.health.averageSleepQualityAvgscore100Deep', { avgScore, deepSleepPercentage: p.deepSleepPercentage, consistencyTrend: p.consistencyTrend, recoveryImpact: p.recoveryImpact })}
      </Text>
      <PlanCard testID="health-plans-sleep-dashboard">
        <View style={healthStyles.row}>
          <HealthIcon name="TrendingUp" size={20} color={palette.category[3]} />
          <SectionTitle>{t('screens.health.weeklySleepAnalytics')}</SectionTitle>
        </View>
        <StatGrid>
          <StatTile icon="Moon" iconColor={palette.category[3]} value={p.avgDuration} label={t('screens.health.avgDuration')} />
          <StatTile ring={{ percent: p.consistencyScore, color: palette.category[3] }} label={t('screens.health.consistency')} badge={`+${p.consistencyTrend}%`} />
          <StatTile icon="Activity" iconColor={palette.category[7]} value={`${p.deepSleepPercentage}%`} label={t('screens.health.deepSleep')} />
          <StatTile icon="Flame" iconColor={palette.warning} value={String(p.streakDays)} label={t('screens.health.dayStreak')} />
        </StatGrid>
        <RecoveryImpact value={p.recoveryImpact} helper={t('screens.health.qualitySleepImprovingYourEnergyPerformance')} />
        <AiSummary text={t('healthNative.plans.aiSummary.sleep')} iconColor={palette.category[3]} />
      </PlanCard>
    </View>
  );
}

// ── mental ────────────────────────────────────────────────────────────────

function DailyMentalCard({ data }: { data: DailyMentalData }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const positive = data.moodEmoji === '😊' || data.moodEmoji === '😌' || data.moodEmoji === '🙂';
  const border = positive ? palette.success : data.moodEmoji === '😐' ? palette.warning : palette.error;
  return (
    <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: border }]} testID={`health-mental-day-${data.dayId}`}>
      <View style={healthStyles.between}>
        <Text weight="600">{t('screens.health.dayValue0Dayname', { value0: data.dayId.split('-')[1], dayName: data.dayName })}</Text>
        <Text size="2xl">{data.moodEmoji}</Text>
      </View>
      <Text size="sm" muted>
        {`${t('screens.health.mood')} `}
        <Text size="sm" weight="500">
          {data.mood}
        </Text>
      </Text>
      <View style={healthStyles.between}>
        <Text size="xs" muted>
          {t('screens.health.focusScore')}
        </Text>
        <Text size="xs" weight="500">{`${data.focusScore} / 100`}</Text>
      </View>
      <Bar percent={data.focusScore} fill={palette.category[1]} track={colors.muted} height={6} />
      <View style={healthStyles.between}>
        <Text size="xs" muted>
          {t('screens.health.stressLevel')}
        </Text>
        <Text size="xs" weight="500">{`${data.stressLevel} / 100`}</Text>
      </View>
      <Bar percent={data.stressLevel} fill={palette.warning} track={colors.muted} height={6} />
      <Text size="xs" muted>
        {`${t('screens.health.mindfulness')} `}
        <Text size="xs" weight="500">
          {data.mindfulnessDuration}
        </Text>
      </Text>
      {data.tags.length > 0 ? (
        <View style={healthStyles.wrap}>
          {data.tags.map((tag, i) => (
            <Badge key={`${tag}-${i}`} variant="secondary">
              {tag}
            </Badge>
          ))}
        </View>
      ) : null}
      <Text size="xs" muted style={styles.italic}>{`💡 ${data.aiNote}`}</Text>
    </View>
  );
}

export function MentalPlanView() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const planData = usePlanData<MentalPlanData>('mental', mockMentalPlan);
  if (!planData?.isGenerated) {
    return (
      <PlanEmptyState
        icon="Brain"
        iconColor={palette.category[4]}
        title={t('health.emptyStates.noMentalPlan')}
        description={t('health.emptyStates.noMentalPlanDesc')}
        testID="health-plans-mental-empty"
      />
    );
  }
  const p = planData.progress;
  return (
    <View style={healthStyles.list} testID="health-plans-mental">
      <OverviewCard
        testID="health-plans-mental-overview"
        title={t('screens.health.yourMentalPlanPoweredByAutopilot')}
        subtitle={t('screens.health.aiguidedInsightsHelpYouManageStress')}
        badgeIcon="Brain"
        tiles={[
          { icon: 'Leaf', iconColor: palette.success, label: t('screens.health.goalFocus'), value: planData.goal },
          { icon: 'Clock', iconColor: palette.warning, label: t('screens.health.schedule'), value: planData.schedule },
          { icon: 'TrendingUp', iconColor: palette.category[1], label: t('screens.health.programProgress'), value: t('screens.health.progresstextCompletionComplete', { progressText: planData.progressText, completion: planData.completion }) },
        ]}
        progressLabel={t('screens.health.trackingYourAverageMentalBalanceFocus')}
        percent={planData.completion}
        insight={planData.aiInsight}
        insightIcon={{ name: 'Brain', color: palette.category[4] }}
        insightLabel={false}
        quoted={false}
        lastUpdated={planData.lastUpdated}
        recalibrateIcon="Settings"
        helper={t('screens.health.recalibrationAdjustsYourMentalGoalsBased')}
      />
      <SectionTitle>{t('screens.health.yourDailyMindTracking')}</SectionTitle>
      {planData.dailyStats.map((d) => (
        <DailyMentalCard key={d.dayId} data={d} />
      ))}
      <Text size="sm" muted style={styles.center}>
        {t('screens.health.avgMoodAvgmoodindexFocusFocusstabilityFocusstabili', {
          avgMoodIndex: p.avgMoodIndex,
          focusStability: p.focusStability,
          focusStabilityTrend: p.focusStabilityTrend,
          stressRecovery: p.stressRecovery,
          mindfulnessStreak: p.mindfulnessStreak,
        })}
      </Text>
      <PlanCard testID="health-plans-mental-dashboard">
        <SectionTitle>{t('screens.health.weeklyMindAnalytics')}</SectionTitle>
        <StatGrid>
          {[
            { icon: 'Smile', color: palette.category[4], label: t('screens.health.avgMoodIndex'), value: p.avgMoodIndex },
            { icon: 'Target', color: palette.category[1], label: t('screens.health.focusStability'), value: p.focusStability, sub: p.focusStabilityTrend },
            { icon: 'TrendingUp', color: palette.warning, label: t('screens.health.stressRecovery'), value: p.stressRecovery },
            { icon: 'Zap', color: palette.warning, label: t('screens.health.mindfulnessStreak'), value: t('screens.health.mindfulnessstreakDays', { mindfulnessStreak: p.mindfulnessStreak }) },
          ].map((m) => (
            <View key={m.label} style={[styles.mindTile, { backgroundColor: colors.background }]}>
              <View style={healthStyles.row}>
                <HealthIcon name={m.icon} size={16} color={m.color} />
                <Text size="xs" muted style={healthStyles.fill}>
                  {m.label}
                </Text>
              </View>
              <Text size="xl" weight="700">
                {m.value}
              </Text>
              {m.sub ? (
                <Text size="xs" color={palette.success}>
                  {m.sub}
                </Text>
              ) : null}
            </View>
          ))}
        </StatGrid>
        <AiSummary text={t('healthNative.plans.aiSummary.mental')} iconColor={palette.category[4]} label={t('screens.health.aiSummary')} />
      </PlanCard>
      {planData.coachMessage ? (
        <PlanCard testID="health-plans-mental-coach">
          <View style={styles.coach}>
            <Text size="xl">🧘♀</Text>
            <View style={healthStyles.fill}>
              <Text size="sm" weight="500" muted>
                {t('screens.health.mindCoachSays')}
              </Text>
              <View style={[healthStyles.row, styles.coachQuote]}>
                <HealthIcon name="Quote" size={16} color={palette.category[4]} />
                <Text size="sm" muted style={[healthStyles.fill, styles.italic]}>
                  {planData.coachMessage}
                </Text>
              </View>
            </View>
          </View>
        </PlanCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  media: { width: '100%', aspectRatio: 4 / 3 },
  mediaBody: { padding: 16, gap: 8 },
  mediaChipStart: { position: 'absolute', top: 12, start: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mediaChipEnd: { position: 'absolute', top: 12, end: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  italic: { fontStyle: 'italic' },
  noMatch: { alignItems: 'center', paddingVertical: 48, borderWidth: 2, borderStyle: 'dashed', borderRadius: 8 },
  dayCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  center: { textAlign: 'center' },
  mindTile: { flexBasis: '47%', flexGrow: 1, borderRadius: 12, padding: 16, gap: 6 },
  coach: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  coachQuote: { alignItems: 'flex-start', marginTop: 4 },
});
