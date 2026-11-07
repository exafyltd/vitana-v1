/**
 * VTID-05461 — twin of `src/components/journey/DreamNorthStar.tsx`, the
 * mobile-web "dream-board" hero of My Journey (the dashboard's single
 * Spotlight card). Same states and content:
 *  - loading (spinner) while the journey — or, in Guided Mode, the guided
 *    progress — resolves; error with Retry when there is no goal;
 *  - Full App: "MY JOURNEY", the countdown ring (goal deadline, else the
 *    90-day onboarding plan) with its phase colours from the goal plan, the
 *    plane badge that opens the plan, the inner day button (open plan / set
 *    goal / set deadline), the goal pill (adjust goal) or the Set-goal CTA;
 *  - Guided Mode: the next session's title, the ring filled by sessions
 *    listened, the "click here / N / session N" start button and the
 *    Completed → Up next → Daily goal stepper (or the learning-goal pill);
 *  - the bottom tagline strip.
 * The ring is drawn with react-native-svg; colours are tokens (the web's
 * pastel hex gradients are expressed with `--category-*` / status tokens).
 * Motion (motion.tsx): the ring fill eases in over 1.4 s (:516-527) and the
 * guided start button's violet glow pulses every 2.2 s (:592-603); reduced
 * motion draws the filled ring and a steady glow.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { Button, Spinner, Text, useUITheme } from '../../ports/ui';
import { alpha, buildJourneyRing, buildPhases, JourneyIcon, useToneColor, type MyJourneyGoal, type MyJourneyJourney } from '../../ports/journey';
import { useGoalPlan } from './data/journey';
import { useJourneyText } from './text';
import { HeartDivider, JourneyCard } from './components';
import { RingProgressCircle, useLoop } from './motion';

const RING_MAX = 220;
const RING_MIN = 150;
const STROKE_RATIO = 14 / RING_MAX;
const NUMBER_RATIO = 88 / RING_MAX;
const STEP_ZONE = 56;
const STEP_SIZE_MAIN = 56;
const STEP_SIZE_SIDE = 40;
const PHASE_GAP = 0.008;

export interface GuidedProgressView {
  completedSessions: number;
  completedInOrder: number;
  totalSessions: number;
  completedTopics: number;
  totalTopics: number;
  pct: number;
  dailyGoal: number;
  completedToday: number;
  remainingToday: number;
  dailyGoalMet: boolean;
}

function JourneyStep({
  value,
  icon,
  label,
  ring,
  fill,
  text,
  size = STEP_SIZE_SIDE,
  done = false,
  testID,
}: {
  value?: number | string;
  icon?: ReactElement;
  label: string;
  ring: string;
  fill: string;
  text: string;
  size?: number;
  done?: boolean;
  testID?: string;
}) {
  const { colors } = useUITheme();
  const badge = Math.round(size * 0.4);
  return (
    <View style={[styles.step, { width: STEP_SIZE_MAIN + 4 }]} testID={testID}>
      <View style={[styles.stepZone, { height: STEP_ZONE }]}>
        <View>
          <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderColor: ring }]}>
            {icon ?? (
              <Text weight="700" color={text} style={{ fontSize: Math.round(size * 0.42) }}>
                {String(value)}
              </Text>
            )}
          </View>
          {done ? (
            <View style={[styles.doneBadge, { width: badge, height: badge, borderRadius: badge / 2, backgroundColor: colors.statusSuccess }]}>
              <JourneyIcon name="Check" size={10} color={colors.primaryForeground} />
            </View>
          ) : null}
        </View>
      </View>
      <Text size="xs" weight="600" color={text} style={styles.center}>
        {label}
      </Text>
    </View>
  );
}

/** The guided start button's violet glow (DreamNorthStar.tsx:579-603): pulsing, steady under reduced motion. */
function StartGlow({ inset, color }: { inset: number; color: string }) {
  const loop = useLoop(true, 2200);
  const frame = { top: inset - 4, bottom: inset - 4, start: inset - 4, end: inset - 4, backgroundColor: alpha(color, 0.3), shadowColor: color };
  if (!loop) return <View pointerEvents="none" testID="journey-hero-start-halo" style={[styles.glow, frame, { opacity: 0.7 }]} />;
  return (
    <Animated.View
      pointerEvents="none"
      testID="journey-hero-start-glow"
      style={[styles.glow, frame, { opacity: loop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] }), transform: [{ scale: loop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}
    />
  );
}

function StepConnector() {
  const { colors } = useUITheme();
  return <View style={[styles.connector, { marginTop: STEP_ZONE / 2, borderColor: colors.border }]} />;
}

export function DreamNorthStar({
  goal,
  journey,
  loading,
  error,
  onSetGoal,
  onRetry,
  onOpenPlan,
  guided = false,
  guidedProgress,
  guidedNextSession,
  onStartSession,
}: {
  goal: MyJourneyGoal | null;
  journey?: MyJourneyJourney | null;
  loading: boolean;
  error?: boolean;
  onSetGoal: () => void;
  onRetry?: () => void;
  onOpenPlan?: () => void;
  guided?: boolean;
  guidedProgress?: GuidedProgressView;
  guidedNextSession?: { session: number; title: string } | null;
  onStartSession?: () => void;
}): ReactElement {
  const { t, fmtDate, localizeGoal } = useJourneyText();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const pink = useToneColor('category-4');
  const blue = useToneColor('category-7');
  const { data: planData } = useGoalPlan();
  const [width, setWidth] = useState(0);
  const ringSize = width ? Math.max(RING_MIN, Math.min(RING_MAX, Math.round((width - 40) * 0.62))) : RING_MAX;
  const minHeight = width ? Math.round(width * 1.25) : undefined;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const phaseTotalDays = goal?.goal_total_days ?? null;
  const phases = useMemo(() => {
    if (!phaseTotalDays || phaseTotalDays <= 0) return [];
    return buildPhases((planData?.plan?.milestones ?? []).map((m) => m.day_offset ?? 0).filter((d) => d > 0), phaseTotalDays);
  }, [planData, phaseTotalDays]);

  const guidedNotReady = guided && (!guidedProgress || guidedProgress.totalSessions === 0);
  if (loading && (guidedNotReady || !goal)) {
    return (
      <JourneyCard tint={violet} radius={28} testID="journey-hero-loading">
        <View style={styles.loading} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
          <Spinner accessibilityLabel={t('common.loading')} />
        </View>
      </JourneyCard>
    );
  }

  if (!loading && error && !goal) {
    return (
      <JourneyCard tint={violet} radius={28} testID="journey-hero-error">
        <View style={styles.errorBox}>
          <View style={[styles.errorIcon, { backgroundColor: alpha(colors.muted, 0.4) }]}>
            <JourneyIcon name="Compass" size={32} color={colors.mutedForeground} />
          </View>
          <Text size="lg" weight="600" accessibilityRole="header" style={styles.center}>
            {t('screens.autopilotdashboard.journeyLoadErrorTitle')}
          </Text>
          <Text size="sm" muted style={styles.center}>
            {t('screens.autopilotdashboard.journeyLoadErrorBody')}
          </Text>
          {onRetry ? (
            <Button variant="outline" onPress={onRetry} testID="journey-hero-retry">
              {t('screens.autopilotdashboard.retry')}
            </Button>
          ) : null}
        </View>
      </JourneyCard>
    );
  }

  const hasDeadline = !!goal?.has_deadline;
  const showGuided = guided && !!guidedProgress;
  const ring = buildJourneyRing(goal, journey ?? null);
  const total = ring.total;
  const stroke = Math.round(ringSize * STROKE_RATIO);
  const numberFont = Math.round(ringSize * NUMBER_RATIO);
  const innerInset = stroke + 4;
  const innerDiameter = Math.max(0, ringSize - innerInset * 2);
  const guidedNumberFont = Math.min(numberFont, Math.round(innerDiameter * 0.48));
  const radius = (ringSize - stroke) / 2;
  const cx = ringSize / 2;
  const cy = ringSize / 2;
  const circumference = 2 * Math.PI * radius;
  const ringPct = showGuided ? (guidedProgress as GuidedProgressView).pct : ring.pct;
  const clamped = Math.min(100, Math.max(0, ringPct));
  const offset = circumference - (clamped / 100) * circumference;
  const hasPhases = !showGuided && hasDeadline && phases.length > 1 && total !== null && total > 0;
  const curFrac = hasPhases && goal?.goal_day != null && total ? Math.max(0, Math.min(1, goal.goal_day / total)) : clamped / 100;
  const ptAt = (frac: number): [number, number] => {
    const a = frac * 2 * Math.PI;
    return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)];
  };
  const phaseArc = (fA: number, fB: number, c: string, opacity: number, key: string) => {
    if (fB - fA <= 0.002) return null;
    const [x1, y1] = ptAt(fA);
    const [x2, y2] = ptAt(fB);
    const large = fB - fA > 0.5 ? 1 : 0;
    return <Path key={key} d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`} fill="none" stroke={c} strokeWidth={stroke} opacity={opacity} />;
  };
  const [dotX, dotY] = ptAt(curFrac);
  const gp = guidedProgress as GuidedProgressView;
  const innerLabel = hasDeadline
    ? t('screens.autopilotdashboard.openPlan')
    : !goal
      ? t('screens.autopilotdashboard.setGoalCta')
      : t('screens.autopilotdashboard.setDeadlineCta');
  const caption = hasDeadline
    ? t('screens.autopilotdashboard.daysToGoalShort', { count: ring.daysLeft })
    : ring.source === 'onboarding'
      ? t('screens.autopilotdashboard.onboardingDaysLeftShort', { count: ring.daysLeft })
      : !goal
        ? t('screens.autopilotdashboard.setGoalSubtitle')
        : t('screens.autopilotdashboard.noDeadlineHint');

  return (
    <View
      onLayout={onLayout}
      testID={showGuided ? 'journey-hero-guided' : 'journey-hero-full'}
      style={[styles.hero, { minHeight, borderColor: alpha(guided ? blue : violet, guided ? 0.25 : 0.15), backgroundColor: guided ? alpha(blue, 0.35) : alpha(pink, 0.16) }]}
    >
      <View style={styles.heroBody}>
        {showGuided && guidedNextSession ? (
          <Text weight="700" color={violet} style={[styles.center, styles.nextTitle]} testID="journey-hero-next-title">
            {guidedNextSession.title}
          </Text>
        ) : (
          <Text size="sm" weight="600" color={violet} style={[styles.center, styles.wide]}>
            {t(showGuided ? 'screens.autopilotdashboard.myGuidedJourney' : 'screens.autopilotdashboard.myJourney').toUpperCase()}
          </Text>
        )}
        <View style={styles.dividerTop}>
          <HeartDivider line={violet} heart={pink} />
        </View>

        <View style={[styles.ringBox, { width: ringSize, height: ringSize }]}>
          <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <Defs>
              <LinearGradient id="dreamRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={pink} />
                <Stop offset="50%" stopColor={violet} />
                <Stop offset="100%" stopColor={colors.statusWarning} />
              </LinearGradient>
            </Defs>
            <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={alpha(violet, 0.12)} strokeWidth={stroke} />
            {hasPhases
              ? phases.flatMap((p, i) => {
                  const tt = total as number;
                  const sF = Math.min(1, p.start / tt + (i > 0 ? PHASE_GAP : 0));
                  const eF = Math.max(sF, p.end / tt - (i < phases.length - 1 ? PHASE_GAP : 0));
                  const nodes: Array<ReactElement | null> = [];
                  if (curFrac > sF) nodes.push(phaseArc(sF, Math.min(eF, curFrac), p.color, 1, `e${i}`));
                  if (curFrac < eF) nodes.push(phaseArc(Math.max(sF, curFrac), eF, p.color, 0.55, `u${i}`));
                  return nodes;
                })
              : showGuided || ring.hasCountdown
                ? (
                    <G rotation={-90} origin={`${cx}, ${cy}`}>
                      <RingProgressCircle
                        testID="journey-ring-progress"
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill="none"
                        stroke="url(#dreamRingGrad)"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        circumference={circumference}
                        offset={offset}
                        durationMs={1400}
                      />
                    </G>
                  )
                : null}
            {!showGuided && ring.hasCountdown ? <Circle cx={dotX} cy={dotY} r={7.5} fill={colors.card} stroke={violet} strokeWidth={3} /> : null}
          </Svg>

          {!showGuided && hasDeadline ? (
            <Pressable
              testID="journey-hero-plane"
              accessibilityRole="button"
              accessibilityLabel={t('screens.autopilotdashboard.openPlan')}
              onPress={onOpenPlan}
              style={[styles.plane, { backgroundColor: alpha(colors.card, 0.95), borderColor: alpha(violet, 0.15) }]}
            >
              <JourneyIcon name="Plane" size={20} color={violet} />
            </Pressable>
          ) : null}

          {showGuided && guidedNextSession ? <StartGlow inset={innerInset} color={violet} /> : null}
          {showGuided ? (
            <Pressable
              testID="journey-hero-start"
              accessibilityRole="button"
              accessibilityLabel={guidedNextSession ? t('screens.autopilotdashboard.startSessionAria', { n: guidedNextSession.session }) : undefined}
              disabled={!guidedNextSession}
              onPress={guidedNextSession ? onStartSession : undefined}
              style={[styles.inner, { top: innerInset, bottom: innerInset, start: innerInset, end: innerInset, backgroundColor: alpha(colors.card, 0.92) }]}
            >
              <Text weight="600" color={violet} numberOfLines={1} style={[styles.center, { fontSize: Math.max(9, Math.min(11, Math.round(innerDiameter * 0.06))), letterSpacing: 0.5 }]}>
                {t(guidedNextSession ? 'screens.autopilotdashboard.clickHere' : 'screens.autopilotdashboard.stepsLabel').toUpperCase()}
              </Text>
              <Text weight="700" color={violet} style={[styles.center, { fontSize: guidedNumberFont, lineHeight: guidedNumberFont * 1.1 }]}>
                {String(guidedNextSession ? guidedNextSession.session : gp.completedTopics)}
              </Text>
              {guidedNextSession ? (
                <Text size="xs" weight="500" color={violet} style={styles.center}>
                  {t('screens.autopilotdashboard.sessionNumber', { n: guidedNextSession.session })}
                </Text>
              ) : (
                <Text size="xs" muted style={styles.center}>
                  {t('screens.autopilotdashboard.stepsCompletedOf', { total: gp.totalTopics })}
                </Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              testID="journey-hero-day"
              accessibilityRole="button"
              accessibilityLabel={innerLabel}
              onPress={hasDeadline ? onOpenPlan : onSetGoal}
              style={[styles.inner, { top: innerInset, bottom: innerInset, start: innerInset, end: innerInset, backgroundColor: alpha(colors.card, 0.92) }]}
            >
              <Text size="sm" weight="600" color={violet} style={[styles.center, styles.wide]}>
                {t('screens.autopilotdashboard.dayLabel').toUpperCase()}
              </Text>
              <Text weight="700" color={violet} style={[styles.center, { fontSize: numberFont, lineHeight: numberFont * 1.05 }]} testID="journey-hero-day-number">
                {ring.hasCountdown ? String(ring.day) : '—'}
              </Text>
              <Text size="xs" muted style={[styles.center, styles.caption]}>
                {caption}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.flex} />

        {showGuided ? (
          guidedNextSession ? (
            <Pressable
              testID="journey-hero-stepper"
              accessibilityRole="button"
              accessibilityLabel={t('screens.autopilotdashboard.startSessionAria', { n: guidedNextSession.session })}
              onPress={onStartSession}
              style={[styles.goalPill, styles.stepperPill, { backgroundColor: alpha(colors.card, 0.95), borderColor: alpha(colors.border, 0.6) }]}
            >
              <Text weight="700" style={styles.center}>
                {t('screens.autopilotdashboard.nextStepLabel')}
              </Text>
              <Text size="sm" weight="500" color={violet} style={styles.center}>
                {t('screens.autopilotdashboard.startSessionShort', { n: guidedNextSession.session })}
              </Text>
              <View style={styles.stepRow}>
                <JourneyStep
                  testID="journey-step-done"
                  value={gp.completedInOrder}
                  label={t('screens.autopilotdashboard.stepDone')}
                  fill={colors.statusSuccessSubtle}
                  ring={colors.statusSuccess}
                  text={colors.statusSuccess}
                  done={gp.completedInOrder > 0}
                />
                <StepConnector />
                <JourneyStep
                  testID="journey-step-next"
                  value={guidedNextSession.session}
                  label={t('screens.autopilotdashboard.stepUpNext')}
                  fill={alpha(violet, 0.15)}
                  ring={violet}
                  text={violet}
                  size={STEP_SIZE_MAIN}
                />
                <StepConnector />
                {gp.dailyGoalMet ? (
                  <JourneyStep
                    testID="journey-step-goal-met"
                    icon={<JourneyIcon name="Medal" size={20} color={colors.statusWarning} />}
                    label={t('screens.autopilotdashboard.dailyGoalMetLabel')}
                    fill={colors.statusWarningSubtle}
                    ring={colors.statusWarning}
                    text={colors.statusWarning}
                  />
                ) : (
                  <JourneyStep
                    testID="journey-step-goal"
                    value={`${gp.completedToday}/${gp.dailyGoal}`}
                    label={t('screens.autopilotdashboard.stepGoalLabel')}
                    fill={colors.statusWarningSubtle}
                    ring={colors.statusWarning}
                    text={colors.statusWarning}
                  />
                )}
              </View>
            </Pressable>
          ) : (
            <View testID="journey-hero-guided-goal" style={[styles.goalPill, { backgroundColor: alpha(colors.card, 0.92), borderColor: alpha(colors.border, 0.6) }]}>
              <View style={[styles.goalIcon, { backgroundColor: violet }]}>
                <JourneyIcon name="Sparkles" size={20} color={colors.primaryForeground} />
              </View>
              <View style={styles.flex}>
                <Text weight="700">{t('screens.autopilotdashboard.guidedGoalTitle')}</Text>
                <View style={styles.dividerSmall}>
                  <HeartDivider width={20} line={violet} heart={pink} />
                </View>
                <Text size="xs" muted>
                  {t('screens.autopilotdashboard.guidedGoalSubtitle', { total: gp.totalSessions })}
                </Text>
              </View>
            </View>
          )
        ) : goal ? (
          <Pressable
            testID="journey-hero-goal"
            accessibilityRole="button"
            accessibilityLabel={t('screens.autopilotdashboard.adjustGoalCta')}
            onPress={onSetGoal}
            style={[styles.goalPill, { backgroundColor: alpha(colors.card, 0.92), borderColor: alpha(colors.border, 0.6) }]}
          >
            <View style={[styles.goalIcon, { backgroundColor: violet }]}>
              <JourneyIcon name="Sparkles" size={20} color={colors.primaryForeground} />
            </View>
            <View style={styles.flex}>
              <Text weight="700">{localizeGoal(goal.active_goal_text)}</Text>
              <View style={styles.dividerSmall}>
                <HeartDivider width={20} line={violet} heart={pink} />
              </View>
              {goal.target_date ? (
                <View style={styles.dateRow}>
                  <JourneyIcon name="CalendarClock" size={14} color={violet} />
                  <Text size="xs" muted>
                    {fmtDate(new Date(goal.target_date), { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              ) : (
                <Text size="xs" weight="500" color={violet}>
                  {t('screens.autopilotdashboard.setDeadlineCta')}
                </Text>
              )}
            </View>
          </Pressable>
        ) : (
          <Button testID="journey-hero-set-goal" onPress={onSetGoal} style={styles.cta} variant="pill">
            {t('screens.autopilotdashboard.setGoalCta')}
          </Button>
        )}

        <View style={[styles.tagline, { backgroundColor: alpha(pink, 0.3) }]}>
          <Text editorial weight="600" color={violet} style={[styles.center, styles.taglineText]}>
            {t('screens.autopilotdashboard.dreamTagline')} ✨
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', borderRadius: 999, shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  hero: { borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  heroBody: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 28 },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  errorIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  wide: { letterSpacing: 4 },
  nextTitle: { fontSize: 20, lineHeight: 24 },
  dividerTop: { marginTop: 6 },
  dividerSmall: { marginVertical: 6, alignItems: 'flex-start' },
  ringBox: { alignSelf: 'center', marginTop: 20 },
  plane: { position: 'absolute', top: -6, alignSelf: 'center', width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { position: 'absolute', borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 4 },
  caption: { paddingHorizontal: 12 },
  flex: { flex: 1 },
  goalPill: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 },
  stepperPill: { flexDirection: 'column', alignItems: 'stretch', gap: 2, paddingVertical: 10 },
  goalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cta: { marginTop: 16 },
  tagline: { marginHorizontal: -20, marginTop: 12, paddingVertical: 12, paddingHorizontal: 20 },
  taglineText: { fontSize: 18, fontStyle: 'italic' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: 8 },
  step: { alignItems: 'center', gap: 6 },
  stepZone: { alignItems: 'center', justifyContent: 'center' },
  disc: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  doneBadge: { position: 'absolute', top: -2, end: -2, alignItems: 'center', justifyContent: 'center' },
  connector: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed' },
});
