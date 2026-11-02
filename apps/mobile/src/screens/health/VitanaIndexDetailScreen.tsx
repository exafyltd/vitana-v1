/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * Vitana Index detail page (`HEALTH.VITANA_INDEX /health/vitana-index`), a
 * 1:1 port of the phone branch of `src/pages/health/VitanaIndexDetail.tsx`
 * (:697-728; the Spotlight branch :652-694 is desktop + flag only, plan
 * decision 6). Top to bottom, as on web:
 *
 *  1. Hero (:133-246): eyebrow, title, the score (skeleton while loading),
 *     "of 999", the tier badge and the up / down trend chip, the hero line,
 *     the 7-day sparkline, "Log today" + refresh, "Updated <date>".
 *  2. The load-error banner (:702-704).
 *  3. The Unified Card System strip, `screen="vitana-index"` (:707).
 *  4. "Let's improve your health" (:259-357): the "Next up" step, the other
 *     open steps, finished steps struck through, "all done".
 *  5. The 90-day goal (:361-416). 6. The pillar breakdown (:420-511): bars,
 *     "biggest lever" / "strongest", the balance note, "Log data".
 *  7. The pillar agents panel (health-hub's twin) and the Mission Alignment
 *     card (:717-718). 8. "How the Index works" (:515-567), collapsible.
 *  Overlays: the log-data dialog and the blood-panel upload sheet (:720-728).
 *
 * The Index comes from health-hub's native module (`useVitanaIndex`, one
 * shared react-query subscription), never re-fetched here. Reads only: the
 * log-data submit and the upload are presented but write-disabled
 * (index-biology/dialogs.tsx, health-hub sheets.tsx).
 * React 19: typed with `ReactElement`.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { HealthReportUploadSheet, useVitanaIndex, type VitanaIndexState, type VitanaPillarKey } from '../../ports/health-data';
import { useHealthPalette, withAlpha } from '../../ports/health';
import { BiologyIcon, useSurfaceColors } from '../../ports/health-biology';
import { navigateToWebPath } from '../../navigation/navigate';
import { PILLAR_KEYS, useHealthText } from './text';
import { VitanaPillarAgentsPanel } from './widgets';
import { balanceKey, buildNextSteps, ELITE_GOAL, goalProgress, heroLineKey, THRIVING_GOAL, type NextStep } from './index-biology/next-steps';
import { useHasBloodPanel } from './index-biology/data';
import { VitanaLogDataDialog } from './index-biology/dialogs';
import { VitanaCardStrip } from './index-biology/VitanaCardStrip';
import { MissionAlignmentCard } from './index-biology/MissionAlignmentCard';

const VITANA_INDEX_MAX = 999;
const PILLAR_MAX = 200;
const k = (key: string) => `vitanaIndexPage.${key}`;

/** VitanaIndexDetail.tsx:76-82. */
const PILLAR_ICONS: Record<VitanaPillarKey, string> = { nutrition: 'Apple', hydration: 'Droplets', exercise: 'Dumbbell', sleep: 'Moon', mental: 'Brain' };

/** VitanaIndexDetail.tsx:84-90. */
const PILLAR_DESCRIPTION_KEYS: Record<VitanaPillarKey, string> = {
  nutrition: 'screens.health.vitanaIndexPillar_food',
  hydration: 'screens.health.vitanaIndexPillar_water',
  exercise: 'screens.health.vitanaIndexPillar_exercise',
  sleep: 'screens.health.vitanaIndexPillar_recovery',
  mental: 'screens.health.vitanaIndexPillar_mental',
};

/** Trackers members recognise. Brand names, so not translated (VitanaIndexDetail.tsx:92-93). */
export const TRACKERS = ['Apple Health', 'Samsung Health', 'Health Connect', 'Garmin', 'Oura', 'Fitbit'];

function useCard() {
  const { colors } = useUITheme();
  return [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];
}

/** VitanaIndexDetail.tsx:129-150 Sparkline (mirrored in RTL like `rtl:-scale-x-100`). */
export function Sparkline({ history }: { history: Array<{ date: string; score: number }> }): ReactElement | null {
  const palette = useHealthPalette();
  const { rtl } = useHealthText();
  if (history.length < 2) return null;
  const scores = history.map((h) => h.score);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = Math.max(max - min, 1);
  const width = 120;
  const height = 36;
  const step = width / (history.length - 1);
  const points = history.map((h, i) => `${i * step},${height - ((h.score - min) / range) * (height - 6) - 3}`).join(' ');
  return (
    <View testID="vitana-index-sparkline" style={rtl ? styles.flip : undefined} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline fill="none" stroke={palette.category[0]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" points={points} />
      </Svg>
    </View>
  );
}

function Hero({ index, isLoading, onLog, onRefresh }: { index: VitanaIndexState | null; isLoading: boolean; onLog: () => void; onRefresh: () => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const surface = useSurfaceColors();
  const { t, rtl, language } = useHealthText();
  const tier = index?.tier;
  const updated = index?.lastUpdated ? new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(new Date(index.lastUpdated)) : null;
  return (
    <View testID="vitana-index-hero" style={[styles.hero, { backgroundColor: surface.page, borderColor: withAlpha(colors.border, 0.7), shadowColor: palette.category[2] }]}>
      <Text size="xs" weight="600" color={palette.category[0]} style={[styles.center, styles.eyebrow]}>
        {t(k('hero.eyebrow'))}
      </Text>
      <Text size="2xl" weight="700" accessibilityRole="header" style={[styles.center, styles.mt2]}>
        {t(k('hero.title'))}
      </Text>
      <View style={styles.scoreWrap}>
        <View style={[styles.glow, { backgroundColor: withAlpha(palette.category[0], 0.18) }]} pointerEvents="none" />
        {isLoading ? (
          <Skeleton testID="vitana-index-score-loading" style={styles.scoreSkeleton} />
        ) : (
          <Text testID="vitana-index-score" weight="700" color={colors.statusSuccess} style={styles.score}>
            {index ? String(index.total) : '—'}
          </Text>
        )}
        <Text size="sm" muted style={styles.mt1}>
          {t('profile.indexHero.ofMax', { max: VITANA_INDEX_MAX })}
        </Text>
      </View>

      {index && tier ? (
        <View style={styles.badges}>
          <View testID="vitana-index-tier" style={[styles.tierBadge, { backgroundColor: `${tier.color}88` }]}>
            <Text size="sm" weight="600">
              {t(tier.labelKey)}
            </Text>
          </View>
          {index.trend === 'up' ? (
            <View testID="vitana-index-trend-up" style={[styles.trend, { backgroundColor: colors.statusSuccessSubtle }]}>
              <View style={rtl ? styles.flip : undefined}>
                <BiologyIcon name="TrendingUp" size={16} color={colors.statusSuccess} />
              </View>
              <Text size="sm" weight="600" color={colors.statusSuccess}>
                {t(k('hero.trendUp'))}
              </Text>
            </View>
          ) : null}
          {index.trend === 'down' ? (
            <View testID="vitana-index-trend-down" style={[styles.trend, { backgroundColor: colors.statusWarningSubtle }]}>
              <View style={rtl ? styles.flip : undefined}>
                <BiologyIcon name="TrendingDown" size={16} color={colors.statusWarning} />
              </View>
              <Text size="sm" weight="600" color={colors.statusWarning}>
                {t(k('hero.trendDown'))}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text muted testID="vitana-index-hero-line" style={[styles.center, styles.mt4]}>
        {t(heroLineKey(index))}
      </Text>

      {index && index.history.length >= 2 ? (
        <View style={styles.sparkRow}>
          <Sparkline history={index.history} />
          <Text size="xs" muted>
            {t(k('hero.last7Days'))}
          </Text>
        </View>
      ) : null}

      <View style={styles.heroActions}>
        <Button testID="vitana-index-log" onPress={onLog} style={styles.primaryBtn}>
          <BiologyIcon name="Plus" size={16} color={colors.primaryForeground} />
          {t(k('hero.logToday'))}
        </Button>
        <Button testID="vitana-index-refresh" variant="outline" onPress={onRefresh} accessibilityLabel={t(k('hero.refreshAria'))} style={styles.roundBtn}>
          <BiologyIcon name="RefreshCw" size={16} />
        </Button>
      </View>

      {updated ? (
        <Text size="xs" muted testID="vitana-index-updated" style={[styles.center, styles.mt3]}>
          {t(k('hero.updated'), { date: updated })}
        </Text>
      ) : null}
    </View>
  );
}

interface StepView {
  icon: string;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  extra?: ReactNode;
}

function StepBody({ view, large = false, testID }: { view: StepView; large?: boolean; testID: string }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const surface = useSurfaceColors();
  const { rtl } = useHealthText();
  return (
    <View style={[styles.stepRow, large ? styles.mt3 : null]}>
      <View style={[large ? styles.stepIconLarge : styles.stepIcon, { backgroundColor: large ? colors.card : surface.sunken }]}>
        <BiologyIcon name={view.icon} size={large ? 20 : 18} color={large ? palette.category[0] : colors.mutedForeground} />
      </View>
      <View style={styles.fill}>
        <Text weight="600" size={large ? 'lg' : 'base'}>
          {view.title}
        </Text>
        <Text size="sm" muted style={styles.mt1}>
          {view.body}
        </Text>
        {view.extra}
        {large ? (
          <Button testID={`${testID}-cta`} size="sm" onPress={view.onCta} style={[styles.primaryBtn, styles.mt3, styles.selfStart]}>
            {view.cta}
          </Button>
        ) : (
          <Pressable testID={`${testID}-cta`} accessibilityRole="button" onPress={view.onCta} style={styles.linkCta}>
            <Text size="sm" weight="600" color={palette.category[0]}>
              {view.cta}
            </Text>
            <View style={rtl ? styles.flip : undefined}>
              <BiologyIcon name="ArrowRight" size={16} color={palette.category[0]} />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function NextSteps({ steps, views }: { steps: NextStep[]; views: Record<NextStep['id'], StepView> }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t, rtl } = useHealthText();
  const card = useCard();
  const [first, ...rest] = steps;
  const openCount = steps.filter((s) => !s.done).length;
  return (
    <View style={card} testID="vitana-index-next-steps">
      <View style={styles.titleRow}>
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.category[0], 0.1) }]}>
          <BiologyIcon name="Sparkles" size={20} color={palette.category[0]} />
        </View>
        <View style={styles.fill}>
          <Text size="lg" weight="700" accessibilityRole="header">
            {t(k('steps.title'))}
          </Text>
          <Text size="sm" muted>
            {t(k('steps.subtitle'))}
          </Text>
        </View>
      </View>

      {first && !first.done ? (
        <View
          testID={`vitana-index-step-${first.id}`}
          style={[styles.nextUp, { backgroundColor: withAlpha(palette.category[0], 0.1), borderColor: withAlpha(palette.category[0], 0.15) }]}
        >
          <View style={[styles.nextUpPill, { backgroundColor: colors.card, borderColor: withAlpha(palette.category[0], 0.15) }]}>
            <View style={rtl ? styles.flip : undefined}>
              <BiologyIcon name="ArrowRight" size={12} color={palette.category[0]} />
            </View>
            <Text size="xs" weight="600" color={palette.category[0]} style={styles.eyebrow}>
              {t(k('steps.nextUp'))}
            </Text>
          </View>
          <StepBody view={views[first.id]} large testID={`vitana-index-step-${first.id}`} />
        </View>
      ) : null}

      <View style={styles.mt3}>
        {(first?.done ? steps : rest).map((step, i) => (
          <View
            key={step.id}
            testID={`vitana-index-step-${step.id}`}
            accessibilityState={{ checked: step.done }}
            style={[styles.stepItem, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border } : null]}
          >
            {step.done ? (
              <View style={styles.doneRow}>
                <View style={[styles.doneIcon, { backgroundColor: colors.statusSuccessSubtle }]}>
                  <BiologyIcon name="Check" size={20} color={colors.statusSuccess} />
                </View>
                <View style={styles.fill}>
                  <Text weight="600" muted style={styles.strike}>
                    {views[step.id].title}
                  </Text>
                  <Text size="sm" color={colors.statusSuccess}>
                    {t(k('steps.done'))}
                  </Text>
                </View>
              </View>
            ) : (
              <StepBody view={views[step.id]} testID={`vitana-index-step-${step.id}`} />
            )}
          </View>
        ))}
      </View>

      {openCount === 0 ? (
        <Text size="sm" weight="500" color={colors.statusSuccess} testID="vitana-index-steps-all-done">
          {t(k('steps.allDone'))}
        </Text>
      ) : null}
    </View>
  );
}

function GoalCard({ index }: { index: VitanaIndexState | null }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const surface = useSurfaceColors();
  const { t } = useHealthText();
  const card = useCard();
  const total = index?.total ?? 0;
  const { target, remaining, ratio } = goalProgress(total);
  const elite = total >= ELITE_GOAL;
  const line = !index ? t(k('goal.noIndex')) : elite ? t(k('goal.elite')) : target === THRIVING_GOAL ? t(k('goal.toThriving'), { points: remaining }) : t(k('goal.toElite'), { points: remaining });
  return (
    <View style={card} testID="vitana-index-goal">
      <View style={styles.row}>
        <BiologyIcon name="Target" size={20} color={palette.category[0]} />
        <Text size="lg" weight="700" accessibilityRole="header">
          {t(k('goal.title'))}
        </Text>
      </View>
      <Text style={styles.mt3} testID="vitana-index-goal-line">
        {line}
      </Text>
      {index && !elite ? (
        <View style={styles.mt4}>
          <View
            testID="vitana-index-goal-bar"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: target, now: total }}
            style={[styles.goalTrack, { backgroundColor: colors.muted }]}
          >
            <View style={[styles.goalFill, { width: `${Math.max(ratio * 100, 3)}%`, backgroundColor: palette.category[0] }]} />
          </View>
          <View style={styles.goalScale}>
            <Text size="xs" muted>
              {String(total)}
            </Text>
            <Text size="xs" weight="600" muted>
              {String(target)}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.mt4, styles.gap2]}>
        <View style={styles.goalRow}>
          <View style={[styles.goalChip, { backgroundColor: withAlpha(palette.category[0], 0.1) }]}>
            <Text size="xs" weight="700" color={palette.category[0]}>{`${THRIVING_GOAL}+`}</Text>
          </View>
          <Text size="sm" muted style={styles.fill}>
            {t(k('goal.thrivingExplain'))}
          </Text>
        </View>
        <View style={styles.goalRow}>
          <View style={[styles.goalChip, { backgroundColor: colors.statusWarningSubtle }]}>
            <Text size="xs" weight="700" color={colors.statusWarning}>{`${ELITE_GOAL}+`}</Text>
          </View>
          <Text size="sm" muted style={styles.fill}>
            {t(k('goal.eliteExplain'))}
          </Text>
        </View>
      </View>
      <View style={[styles.note, { backgroundColor: surface.sunken }]}>
        <BiologyIcon name="Compass" size={16} color={colors.mutedForeground} />
        <Text size="sm" muted style={styles.fill}>
          {t(k('goal.compass'))}
        </Text>
      </View>
    </View>
  );
}

function PillarsCard({ index, onLog }: { index: VitanaIndexState | null; onLog: () => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const surface = useSurfaceColors();
  const { t, pillarLabel } = useHealthText();
  const card = useCard();
  const keys = PILLAR_KEYS;
  const values = keys.map((key) => index?.pillars[key] ?? 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  // Only call a pillar the "biggest lever" when it actually lags behind another.
  const weakest = index && maxVal > minVal ? keys[values.indexOf(minVal)] : null;
  const strongest = index && maxVal > minVal ? keys[values.indexOf(maxVal)] : null;
  const balance = balanceKey(index?.balanceFactor ?? null);
  return (
    <View style={card} testID="vitana-index-pillars">
      <Text size="lg" weight="700" accessibilityRole="header">
        {t(k('pillars.title'))}
      </Text>
      <Text size="sm" muted>
        {t(k('pillars.subtitle'))}
      </Text>
      <View style={[styles.mt4, styles.gap4]}>
        {keys.map((key) => {
          const value = index?.pillars[key] ?? 0;
          const isWeakest = key === weakest;
          const tone = isWeakest ? colors.statusWarning : palette.category[0];
          return (
            <View key={key} testID={`vitana-index-pillar-${key}`} style={styles.pillarRow}>
              <View style={[styles.pillarIcon, { backgroundColor: isWeakest ? colors.statusWarningSubtle : withAlpha(palette.category[0], 0.1) }]}>
                <BiologyIcon name={PILLAR_ICONS[key]} size={18} color={tone} />
              </View>
              <View style={styles.fill}>
                <View style={styles.pillarHead}>
                  <View style={styles.pillarName}>
                    <Text weight="600" numberOfLines={1} style={styles.shrink}>
                      {pillarLabel(key)}
                    </Text>
                    {isWeakest ? (
                      <View testID={`vitana-index-pillar-${key}-lever`} style={[styles.tag, { backgroundColor: colors.statusWarningSubtle, borderColor: withAlpha(colors.statusWarning, 0.25), borderWidth: 1 }]}>
                        <Text weight="600" color={colors.statusWarning} style={styles.tagText}>
                          {t(k('pillars.biggestLever'))}
                        </Text>
                      </View>
                    ) : null}
                    {key === strongest ? (
                      <View testID={`vitana-index-pillar-${key}-strongest`} style={[styles.tag, { backgroundColor: colors.statusSuccessSubtle }]}>
                        <Text weight="600" color={colors.statusSuccess} style={styles.tagText}>
                          {t(k('pillars.strongest'))}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text size="sm" muted testID={`vitana-index-pillar-${key}-value`}>{`${value}/${PILLAR_MAX}`}</Text>
                </View>
                <View style={[styles.pillarTrack, { backgroundColor: colors.muted }]}>
                  <View style={[styles.pillarFill, { width: `${Math.min((value / PILLAR_MAX) * 100, 100)}%`, backgroundColor: isWeakest ? withAlpha(colors.statusWarning, 0.8) : palette.category[0] }]} />
                </View>
                <Text size="xs" muted style={styles.mt1}>
                  {t(PILLAR_DESCRIPTION_KEYS[key])}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {balance ? (
        <View style={[styles.note, { backgroundColor: surface.sunken }]} testID="vitana-index-balance">
          <BiologyIcon name="Scale" size={16} color={colors.mutedForeground} />
          <Text size="sm" muted style={styles.fill}>
            {t(balance)}
          </Text>
        </View>
      ) : null}
      <Button testID="vitana-index-pillars-log" variant="outline" onPress={onLog} style={[styles.mt4, styles.roundFull]}>
        <BiologyIcon name="Plus" size={16} />
        {t(k('pillars.logCta'))}
      </Button>
    </View>
  );
}

function HowItWorks({ onJourney }: { onJourney: () => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const surface = useSurfaceColors();
  const { t, rtl } = useHealthText();
  const card = useCard();
  const [open, setOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rotation, { toValue: open ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  }, [open, rotation]);
  const rows = [
    { icon: 'Compass', title: t(k('how.baselineTitle')), body: t(k('how.baselineBody')) },
    { icon: 'Route', title: t(k('how.actionsTitle')), body: t(k('how.actionsBody')) },
    { icon: 'Watch', title: t(k('how.dataTitle')), body: t(k('how.dataBody')) },
    { icon: 'Flame', title: t(k('how.streakTitle')), body: t(k('how.streakBody')) },
    { icon: 'Scale', title: t(k('how.balanceTitle')), body: t(k('how.balanceBody')) },
  ];
  return (
    <View style={card} testID="vitana-index-how">
      <Pressable testID="vitana-index-how-toggle" accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((v) => !v)} style={styles.howHead}>
        <View style={styles.fill}>
          <Text size="lg" weight="700">
            {t(k('how.title'))}
          </Text>
          <Text size="sm" muted>
            {t(k('how.subtitle'))}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
          <BiologyIcon name="ChevronDown" size={20} color={colors.mutedForeground} />
        </Animated.View>
      </Pressable>
      {open ? (
        <View testID="vitana-index-how-body">
          <View style={[styles.mt4, styles.gap3]}>
            {rows.map((r) => (
              <View key={r.icon} style={styles.howRow}>
                <View style={[styles.howIcon, { backgroundColor: surface.sunken }]}>
                  <BiologyIcon name={r.icon} size={16} color={colors.mutedForeground} />
                </View>
                <View style={styles.fill}>
                  <Text weight="600">{r.title}</Text>
                  <Text size="sm" muted>
                    {r.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Pressable testID="vitana-index-how-journey" accessibilityRole="button" onPress={onJourney} style={[styles.linkCta, styles.mt4]}>
            <Text size="sm" weight="600" color={palette.category[0]}>
              {t(k('how.journeyCta'))}
            </Text>
            <View style={rtl ? styles.flip : undefined}>
              <BiologyIcon name="ArrowRight" size={16} color={palette.category[0]} />
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function VitanaIndexDetailScreen(): ReactElement {
  const { colors } = useUITheme();
  const surface = useSurfaceColors();
  const { t, pillarLabel } = useHealthText();
  const { index, isLoading, isError, refetch } = useVitanaIndex();
  const { data: hasBloodPanel = false } = useHasBloodPanel();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const steps = useMemo(() => buildNextSteps(index, { hasBloodPanel }), [index, hasBloodPanel]);
  const focusStep = steps.find((s) => s.id === 'focus');
  const focusPillar = focusStep?.pillar;

  const views: Record<NextStep['id'], StepView> = {
    blood: {
      icon: 'TestTube',
      title: t(k('steps.bloodTitle')),
      body: t(k('steps.bloodBody')),
      cta: t(k('steps.bloodCta')),
      onCta: () => setUploadOpen(true),
      extra: (
        <Pressable testID="vitana-index-blood-no-test" accessibilityRole="link" onPress={() => navigateToWebPath('/health/my-biology')} style={styles.mt2}>
          <Text size="sm" muted style={styles.underline}>
            {t(k('steps.bloodNoTest'))}
          </Text>
        </Pressable>
      ),
    },
    devices: {
      icon: 'Watch',
      title: t(k('steps.devicesTitle')),
      body: t(k('steps.devicesBody')),
      cta: t(k('steps.devicesCta')),
      onCta: () => navigateToWebPath('/connectors?tab=fitness'),
      extra: (
        <View style={[styles.trackers, styles.mt2]} testID="vitana-index-trackers">
          {TRACKERS.map((name) => (
            <View key={name} style={[styles.tracker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text size="xs" weight="500" muted>
                {name}
              </Text>
            </View>
          ))}
        </View>
      ),
    },
    focus: {
      icon: focusPillar ? PILLAR_ICONS[focusPillar] : 'Target',
      title: t(k('steps.focusTitle'), { pillar: focusPillar ? pillarLabel(focusPillar) : '' }),
      body: t(k(focusStep?.even ? 'steps.focusBodyEven' : 'steps.focusBody')),
      cta: t(k('steps.focusCta')),
      onCta: () => setLogDialogOpen(true),
    },
    journey: {
      icon: 'Route',
      title: t(k('steps.journeyTitle')),
      body: t(k('steps.journeyBody')),
      cta: t(k('steps.journeyCta')),
      onCta: () => navigateToWebPath('/autopilot'),
    },
  };

  return (
    <View style={[styles.fill, { backgroundColor: withAlpha(surface.sunken, 0.6) }]}>
      <ScrollView testID="screen-vitana-index" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Hero index={index} isLoading={isLoading} onLog={() => setLogDialogOpen(true)} onRefresh={refetch} />
        {isError ? (
          <View testID="vitana-index-error" style={[styles.errorBanner, { backgroundColor: colors.statusErrorSubtle }]}>
            <Text size="sm" color={colors.statusError}>
              {t('screens.health.couldNotLoadYourIndexTry')}
            </Text>
          </View>
        ) : null}
        <VitanaCardStrip />
        <NextSteps steps={steps} views={views} />
        <GoalCard index={index} />
        <PillarsCard index={index} onLog={() => setLogDialogOpen(true)} />
        <VitanaPillarAgentsPanel />
        <MissionAlignmentCard />
        <HowItWorks onJourney={() => navigateToWebPath('/autopilot')} />
      </ScrollView>
      <VitanaLogDataDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />
      <HealthReportUploadSheet open={uploadOpen} onOpenChange={setUploadOpen} defaultCategory="blood_panel" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  center: { textAlign: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  page: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, gap: 16 },
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 12 },
  mt4: { marginTop: 16 },
  gap2: { gap: 8 },
  gap3: { gap: 12 },
  gap4: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 2 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  hero: { borderRadius: 24, borderWidth: 1, padding: 20, overflow: 'hidden', shadowOpacity: 0.12, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  scoreWrap: { alignItems: 'center', marginTop: 16 },
  glow: { position: 'absolute', top: -24, width: 192, height: 192, borderRadius: 96, alignSelf: 'center' },
  score: { fontSize: 84, lineHeight: 92, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreSkeleton: { width: 144, height: 80, borderRadius: 12, marginVertical: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  tierBadge: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 4 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  sparkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 },
  heroActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  primaryBtn: { borderRadius: 999, height: 44, paddingHorizontal: 20, gap: 8 },
  roundBtn: { borderRadius: 999, height: 44, width: 44, paddingHorizontal: 0 },
  roundFull: { borderRadius: 999, height: 44, gap: 8 },
  selfStart: { alignSelf: 'flex-start', height: 40 },
  errorBanner: { borderRadius: 16, padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sectionIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nextUp: { marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 16 },
  nextUpPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  stepItem: { paddingVertical: 12 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepIcon: { width: 36, height: 36, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepIconLarge: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  linkCta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  strike: { textDecorationLine: 'line-through' },
  underline: { textDecorationLine: 'underline' },
  trackers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tracker: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  goalTrack: { height: 12, borderRadius: 999, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 999 },
  goalScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  goalChip: { height: 20, borderRadius: 999, paddingHorizontal: 8, justifyContent: 'center', marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 16, padding: 12, marginTop: 16 },
  pillarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pillarIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pillarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pillarName: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, lineHeight: 14 },
  pillarTrack: { height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 6 },
  pillarFill: { height: '100%', borderRadius: 999 },
  howHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  howRow: { flexDirection: 'row', gap: 12 },
  howIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
