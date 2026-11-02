/**
 * VTID-05461 — the two goal sheets of My Journey:
 *  - `GoalSetupDialog` (twin of `src/components/journey/GoalSetupDialog.tsx`):
 *    goal text, deadline (YYYY-MM-DD, not before today), optional target value
 *    and unit, prefilled from the active Life Compass; Save writes a new
 *    compass version (`life_compass`, previous row deactivated) and then the
 *    dashboard asks Vitana for the plan and opens the plan sheet.
 *  - `GoalPlanSheet` (twin of `src/components/journey/GoalPlanSheet.tsx`): the
 *    end-side sheet with the day-by-day plan — progress ring (phases from
 *    milestones), day badge, schedule trend, "next up" (daily progress + next
 *    milestone countdown), every-day habits (tap toggles done), the weekly
 *    rhythm (one row per title, tap shows the dates), dated milestones, and
 *    Regenerate. With no plan it builds one automatically once per open;
 *    clarifying questions from Vitana are answered inline.
 * Plan generation passes the member's language (data/journey.ts, R2.5).
 * The native date field is a text input with the ISO format the web `<input
 * type="date">` submits; the platform date picker is not part of the N2 kit.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { Badge, Button, Spinner, Text, useUITheme } from '../../ports/ui';
import {
  alpha,
  buildPhases,
  computeGoalTrend,
  Input,
  JourneyIcon,
  Label,
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  useToneColor,
  type GoalPlanStep,
  type GoalTrend,
  type RingPhase,
} from '../../ports/journey';
import { useJourneyText } from './text';
import { useCompleteGoalStep, useGenerateGoalPlan, useGoalPlan, localDateKey } from './data/journey';
import { useLifeCompass } from './data/supabase';

// ── goal setup ───────────────────────────────────────────────────────────
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function GoalSetupDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved?: () => void }): ReactElement {
  const { t } = useJourneyText();
  const { compass, updateCompassAsync, isUpdating } = useLifeCompass();
  const [goalText, setGoalText] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  useEffect(() => {
    if (!open) return;
    setGoalText(compass?.primary_goal ?? '');
    setTargetDate(compass?.target_date ?? '');
    setTargetValue(compass?.target_value != null ? String(compass.target_value) : '');
    setTargetUnit(compass?.target_unit ?? '');
  }, [open, compass]);
  const dateValid = ISO_DATE.test(targetDate) && targetDate >= localDateKey();
  const canSave = goalText.trim().length > 0 && targetDate.length > 0 && dateValid && !isUpdating;
  const handleSave = async () => {
    if (!canSave) return;
    const parsed = targetValue.trim() === '' ? null : Number(targetValue);
    try {
      await updateCompassAsync({
        primary_goal: goalText.trim(),
        category: compass?.category ?? 'general',
        target_date: targetDate,
        target_value: parsed !== null && Number.isFinite(parsed) ? parsed : null,
        target_unit: targetUnit.trim() === '' ? null : targetUnit.trim(),
      });
      onOpenChange(false);
      onSaved?.();
    } catch {
      /* the hook raised the error toast; keep the dialog open */
    }
  };
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent testID="goal-setup">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.autopilotdashboard.goalDialogTitle')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t('screens.autopilotdashboard.goalDialogSubtitle')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <View style={styles.field}>
            <Label>{t('screens.autopilotdashboard.goalFieldLabel')}</Label>
            <Input value={goalText} onChangeText={setGoalText} placeholder={t('screens.autopilotdashboard.goalFieldPlaceholder')} testID="goal-setup-text" />
          </View>
          <View style={styles.field}>
            <Label>{t('screens.autopilotdashboard.deadlineFieldLabel')}</Label>
            <Input value={targetDate} onChangeText={setTargetDate} placeholder={localDateKey()} autoCapitalize="none" testID="goal-setup-date" />
          </View>
          <View style={styles.twoCol}>
            <View style={[styles.field, styles.flex]}>
              <Label>{t('screens.autopilotdashboard.targetValueLabel')}</Label>
              <Input type="number" keyboardType="decimal-pad" value={targetValue} onChangeText={setTargetValue} testID="goal-setup-value" />
            </View>
            <View style={[styles.field, styles.flex]}>
              <Label>{t('screens.autopilotdashboard.targetUnitLabel')}</Label>
              <Input value={targetUnit} onChangeText={setTargetUnit} testID="goal-setup-unit" />
            </View>
          </View>
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <View style={styles.footerRow}>
            <Button variant="outline" onPress={() => onOpenChange(false)} testID="goal-setup-cancel">
              {t('screens.common.cancel')}
            </Button>
            <Button onPress={() => void handleSave()} disabled={!canSave} testID="goal-setup-save">
              {t('screens.autopilotdashboard.goalDialogSave')}
            </Button>
          </View>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

// ── plan sheet ───────────────────────────────────────────────────────────
/** web GoalProgressRing (no glow): phase bands + today marker, else the single gradient. */
function GoalProgressRing({ pct, day, daysLeft, phases, currentDay, totalDays, size = 164 }: { pct: number; day: number; daysLeft: number; phases: RingPhase[]; currentDay: number; totalDays: number; size?: number }) {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const blue = useToneColor('category-3');
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const hasPhases = phases.length > 1 && totalDays > 0;
  const curFrac = hasPhases ? Math.max(0, Math.min(1, currentDay / totalDays)) : 0;
  const pt = (frac: number): [number, number] => {
    const a = frac * 2 * Math.PI;
    return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)];
  };
  const arc = (fA: number, fB: number, c: string, opacity: number, key: string) => {
    if (fB - fA <= 0.002) return null;
    const [x1, y1] = pt(fA);
    const [x2, y2] = pt(fB);
    return <Path key={key} d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${fB - fA > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`} fill="none" stroke={c} strokeWidth={stroke} opacity={opacity} />;
  };
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clamped / 100) * circumference;
  const [mx, my] = pt(curFrac);
  return (
    <View style={{ width: size, height: size }} testID="goal-plan-ring">
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={alpha(colors.mutedForeground, 0.3)} strokeWidth={stroke} />
        {hasPhases ? (
          <>
            {phases.flatMap((p, i) => {
              const sF = Math.min(1, p.start / totalDays + (i > 0 ? 0.008 : 0));
              const eF = Math.max(sF, p.end / totalDays - (i < phases.length - 1 ? 0.008 : 0));
              const nodes: Array<ReactElement | null> = [];
              if (curFrac > sF) nodes.push(arc(sF, Math.min(eF, curFrac), p.color, 1, `e${i}`));
              if (curFrac < eF) nodes.push(arc(Math.max(sF, curFrac), eF, p.color, 0.65, `u${i}`));
              return nodes;
            })}
            <Circle cx={mx} cy={my} r={stroke / 2 + 1.5} fill={colors.card} stroke={colors.mutedForeground} strokeWidth={2.5} />
          </>
        ) : (
          <G rotation={-90} origin={`${cx}, ${cy}`}>
            <Defs>
              <LinearGradient id="goalprogress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.statusSuccess} />
                <Stop offset="100%" stopColor={blue} />
              </LinearGradient>
            </Defs>
            <Circle cx={cx} cy={cy} r={radius} fill="none" stroke="url(#goalprogress-gradient)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference}`} strokeDashoffset={offset} />
          </G>
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
        <Text size="xs" muted>
          {t('screens.autopilotdashboard.dayLabel').toUpperCase()}
        </Text>
        <Text weight="700" style={styles.ringDay}>
          {String(day)}
        </Text>
        <Text size="xs" muted>
          {t('screens.autopilotdashboard.daysLeftCount', { days: daysLeft })}
        </Text>
      </View>
    </View>
  );
}

function GoalTrendBadge({ trend }: { trend: GoalTrend }) {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const tone = trend === 'up' ? colors.statusSuccess : trend === 'flat' ? colors.statusWarning : colors.statusError;
  const icon = trend === 'up' ? 'ArrowUp' : trend === 'flat' ? 'ArrowRight' : 'ArrowDown';
  const label = trend === 'up' ? t('screens.autopilotdashboard.trendOnTrack') : trend === 'flat' ? t('screens.autopilotdashboard.trendStagnating') : t('screens.autopilotdashboard.trendBehind');
  return (
    <View style={[styles.trend, { borderColor: alpha(tone, 0.2), backgroundColor: alpha(tone, 0.1) }]} testID={`goal-trend-${trend}`}>
      <JourneyIcon name={icon} size={14} color={tone} />
      <Text size="xs" weight="600" color={tone}>
        {label}
      </Text>
    </View>
  );
}

function StepRow({ step, onToggle, highlight }: { step: GoalPlanStep; onToggle: (s: GoalPlanStep) => void; highlight?: boolean }) {
  const { colors } = useUITheme();
  const blue = useToneColor('category-3');
  const done = step.status === 'done';
  const icon = step.kind === 'milestone' ? 'Trophy' : step.kind === 'checkpoint' ? 'Flag' : 'Repeat';
  const tint = step.kind === 'milestone' ? colors.statusWarning : step.kind === 'checkpoint' ? colors.statusInfo : colors.statusSuccess;
  return (
    <Pressable
      testID={`goal-step-${step.id}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={() => onToggle(step)}
      style={[
        styles.step,
        { borderColor: done ? alpha(colors.statusSuccess, 0.3) : highlight ? alpha(blue, 0.3) : alpha(colors.border, 0.6) },
        done ? { backgroundColor: alpha(colors.statusSuccess, 0.05) } : highlight ? { backgroundColor: alpha(blue, 0.05) } : null,
      ]}
    >
      <JourneyIcon name={done ? 'CheckCircle2' : 'Circle'} size={20} color={done ? colors.statusSuccess : colors.mutedForeground} />
      <View style={styles.flex}>
        <View style={styles.inline}>
          <JourneyIcon name={icon} size={14} color={tint} />
          <Text size="sm" weight="500" muted={done} style={[styles.flex, done ? styles.strike : null]}>
            {step.title}
          </Text>
        </View>
        {step.description ? (
          <Text size="xs" muted>
            {step.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function CadenceRow({ step, dates }: { step: GoalPlanStep; dates: string[] }) {
  const { fmtDate } = useJourneyText();
  const { colors } = useUITheme();
  const blue = useToneColor('category-3');
  const [open, setOpen] = useState(false);
  const hasDates = dates.length > 0;
  return (
    <View style={[styles.cadence, { borderColor: alpha(colors.border, 0.6) }]} testID={`goal-cadence-${step.id}`}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => hasDates && setOpen((o) => !o)} style={styles.cadenceHead}>
        <JourneyIcon name="Flag" size={16} color={blue} />
        <View style={styles.flex}>
          <Text size="sm" weight="500">
            {step.title}
          </Text>
          {step.description ? (
            <Text size="xs" muted>
              {step.description}
            </Text>
          ) : null}
        </View>
        {hasDates ? <JourneyIcon name="ChevronDown" size={16} color={colors.mutedForeground} /> : null}
      </Pressable>
      {open && hasDates ? (
        <View style={styles.dates} testID={`goal-cadence-${step.id}-dates`}>
          {dates.map((d) => (
            <View key={d} style={[styles.dateChip, { backgroundColor: alpha(colors.muted, 0.4) }]}>
              <Text size="xs" muted>
                {fmtDate(new Date(d), { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text size="xs" weight="600" muted style={styles.sectionTitle}>
      {children.toUpperCase()}
    </Text>
  );
}

export function GoalPlanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }): ReactElement {
  const { t, fmtDate, localizeGoal } = useJourneyText();
  const { colors } = useUITheme();
  const blue = useToneColor('category-3');
  const { data, isLoading } = useGoalPlan();
  const generate = useGenerateGoalPlan();
  const complete = useCompleteGoalStep();
  const plan = data?.plan ?? null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const onToggle = (s: GoalPlanStep) => complete.mutate({ stepId: s.id, done: s.status !== 'done' });
  const genError = generate.isError ? ((generate.error as Error)?.message ?? 'error') : generate.data && generate.data.ok === false ? (generate.data.error ?? 'generation_failed') : null;
  const questions = generate.data?.needs_clarification ? (generate.data.questions ?? []) : [];
  const clarifyMode = !plan && questions.length > 0;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submitAnswers = () => generate.mutate({ answers: questions.map((q) => ({ question: q, answer: answers[q] ?? '' })) });
  const autoTried = useRef(false);
  const stepless = !plan || (plan.milestones.length === 0 && plan.checkpoints.length === 0 && plan.habits.length === 0);
  const { mutate: generateMutate, isPending: generatePending } = generate;
  useEffect(() => {
    if (!open) {
      autoTried.current = false;
      setAnswers((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (isLoading || generatePending || genError || clarifyMode) return;
    if (stepless && !autoTried.current) {
      autoTried.current = true;
      generateMutate(undefined);
    }
  }, [open, isLoading, stepless, genError, clarifyMode, generatePending, generateMutate]);

  const milestones = plan ? [...plan.milestones].sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? '')) : [];
  const weeklyCadence = (() => {
    if (!plan) return [] as Array<{ rep: GoalPlanStep; dates: string[] }>;
    const map = new Map<string, { rep: GoalPlanStep; dates: string[] }>();
    for (const c of plan.checkpoints) {
      const key = c.title.trim().toLowerCase();
      let g = map.get(key);
      if (!g) {
        g = { rep: c, dates: [] };
        map.set(key, g);
      }
      if (c.scheduled_date) g.dates.push(c.scheduled_date);
    }
    const out = [...map.values()];
    for (const g of out) {
      const upcoming = g.dates.filter((d) => d >= todayIso).sort();
      g.dates = upcoming.length ? upcoming : [...g.dates].sort();
    }
    return out;
  })();
  const planDay = plan ? Math.min(plan.day + 1, plan.total_days) : 0;
  const planPct = plan ? Math.min(100, Math.round((plan.day / Math.max(1, plan.total_days)) * 100)) : 0;
  const planPhases = plan ? buildPhases(plan.milestones.map((m) => m.day_offset ?? 0).filter((d) => d > 0), plan.total_days) : [];
  const trend = computeGoalTrend(plan, todayIso);
  const habitsTotal = plan ? plan.habits.length : 0;
  const habitsDone = plan ? plan.habits.filter((h) => h.status === 'done').length : 0;
  const nextMilestone = milestones.find((m) => m.status !== 'done') ?? null;
  const nextMsDays = nextMilestone?.scheduled_date ? Math.round((Date.parse(nextMilestone.scheduled_date) - Date.parse(todayIso)) / 86_400_000) : null;
  const nextCountdown =
    nextMsDays == null ? null : nextMsDays <= 0 ? t('screens.autopilotdashboard.planToday') : nextMsDays === 1 ? t('screens.autopilotdashboard.planTomorrow') : t('screens.autopilotdashboard.planInDays', { days: nextMsDays });
  const building = (
    <>
      <Spinner accessibilityLabel={t('screens.autopilotdashboard.planBuilding')} />
      {t('screens.autopilotdashboard.planBuilding')}
    </>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" testID="goal-plan">
        <ScrollView contentContainerStyle={styles.sheet}>
          <SheetHeader>
            <SheetTitle>{t('screens.autopilotdashboard.planSheetTitle')}</SheetTitle>
            {plan ? <SheetDescription>{localizeGoal(plan.goal_text)}</SheetDescription> : null}
          </SheetHeader>
          {isLoading ? (
            <View style={styles.centerBox} testID="goal-plan-loading">
              <Spinner accessibilityLabel={t('common.loading')} />
            </View>
          ) : clarifyMode ? (
            <View style={styles.gap20} testID="goal-plan-clarify">
              <View style={styles.centerCol}>
                <View style={[styles.badgeIcon, { backgroundColor: alpha(colors.statusSuccess, 0.3) }]}>
                  <JourneyIcon name="Sparkles" size={24} color={colors.statusSuccess} />
                </View>
                <Text weight="600">{t('screens.autopilotdashboard.planClarifyTitle')}</Text>
                <Text size="sm" muted style={styles.center}>
                  {t('screens.autopilotdashboard.planClarifyIntro')}
                </Text>
              </View>
              {questions.map((q, i) => (
                <View key={i} style={styles.field}>
                  <Label>{q}</Label>
                  <Textarea rows={2} value={answers[q] ?? ''} onChangeText={(v) => setAnswers((prev) => ({ ...prev, [q]: v }))} placeholder={t('screens.autopilotdashboard.planClarifyPlaceholder')} testID={`goal-plan-answer-${i}`} />
                </View>
              ))}
              <Button onPress={submitAnswers} disabled={generate.isPending} testID="goal-plan-submit">
                {generate.isPending ? building : t('screens.autopilotdashboard.planGenerate')}
              </Button>
            </View>
          ) : !plan ? (
            <View style={styles.centerCol} testID="goal-plan-empty">
              <View style={[styles.badgeIcon, { backgroundColor: alpha(colors.statusSuccess, 0.3) }]}>
                <JourneyIcon name="Sparkles" size={28} color={colors.statusSuccess} />
              </View>
              <Text size="sm" muted style={styles.center}>
                {t('screens.autopilotdashboard.planSheetEmpty')}
              </Text>
              {genError && !generate.isPending ? (
                <Text size="xs" color={colors.statusError} style={styles.center} testID="goal-plan-error">
                  {t('screens.autopilotdashboard.planError', { error: genError })}
                </Text>
              ) : null}
              <Button onPress={() => generate.mutate(undefined)} disabled={generate.isPending} testID="goal-plan-generate">
                {generate.isPending ? building : t('screens.autopilotdashboard.planGenerate')}
              </Button>
            </View>
          ) : (
            <View style={styles.gap20} testID="goal-plan-loaded">
              <View style={styles.centerCol}>
                <GoalProgressRing pct={planPct} day={planDay} daysLeft={plan.days_left} phases={planPhases} currentDay={plan.day} totalDays={plan.total_days} />
                <View style={styles.inlineWrap}>
                  <Badge variant="secondary">{t('screens.autopilotdashboard.planDayOfTotal', { day: planDay, total: plan.total_days })}</Badge>
                  {trend ? <GoalTrendBadge trend={trend} /> : null}
                </View>
                {plan.plan_summary ? (
                  <Text size="sm" muted style={styles.center}>
                    {plan.plan_summary}
                  </Text>
                ) : null}
              </View>
              {habitsTotal > 0 || nextMilestone ? (
                <>
                  <Separator />
                  <SectionTitle>{t('screens.autopilotdashboard.planNextUp')}</SectionTitle>
                  <View style={[styles.next, { borderColor: alpha(blue, 0.3), backgroundColor: alpha(blue, 0.05) }]} testID="goal-plan-next">
                    {habitsTotal > 0 ? (
                      <View style={styles.gap6}>
                        <View style={styles.between}>
                          <Text size="xs" weight="500">
                            {t('screens.autopilotdashboard.planDailyProgress', { done: habitsDone, total: habitsTotal })}
                          </Text>
                          {habitsDone >= habitsTotal ? <JourneyIcon name="CheckCircle2" size={16} color={colors.statusSuccess} /> : null}
                        </View>
                        <View style={[styles.track, { backgroundColor: alpha(colors.muted, 0.4) }]}>
                          <View style={[styles.fill, { width: `${Math.round((habitsDone / Math.max(1, habitsTotal)) * 100)}%`, backgroundColor: colors.statusSuccess }]} />
                        </View>
                      </View>
                    ) : null}
                    {nextMilestone ? (
                      <View style={styles.inlineTop}>
                        <JourneyIcon name="Trophy" size={16} color={colors.statusWarning} />
                        <View style={styles.flex}>
                          <Text size="xs" muted>
                            {`${t('screens.autopilotdashboard.planNextMilestone').toUpperCase()}${nextCountdown ? ` · ${nextCountdown}` : ''}`}
                          </Text>
                          <Text size="sm" weight="500">
                            {nextMilestone.title}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}
              {plan.habits.length > 0 ? (
                <>
                  <Separator />
                  <SectionTitle>{t('screens.autopilotdashboard.planEveryDay')}</SectionTitle>
                  {plan.habits.map((h) => (
                    <StepRow key={h.id} step={h} onToggle={onToggle} />
                  ))}
                </>
              ) : null}
              {weeklyCadence.length > 0 ? (
                <>
                  <Separator />
                  <SectionTitle>{t('screens.autopilotdashboard.planEveryWeek')}</SectionTitle>
                  {weeklyCadence.map((g) => (
                    <CadenceRow key={g.rep.id} step={g.rep} dates={g.dates} />
                  ))}
                </>
              ) : null}
              {milestones.length > 0 ? (
                <>
                  <Separator />
                  <SectionTitle>{t('screens.autopilotdashboard.planMilestones')}</SectionTitle>
                  {milestones.map((s) => {
                    const isNext = nextMilestone?.id === s.id;
                    return (
                      <View key={s.id} style={styles.gap6}>
                        <View style={styles.inline}>
                          {s.scheduled_date ? (
                            <Text size="xs" muted>
                              {`${fmtDate(new Date(s.scheduled_date), { day: 'numeric', month: 'short' })}${s.scheduled_date === todayIso ? ` · ${t('screens.autopilotdashboard.planToday')}` : ''}`}
                            </Text>
                          ) : null}
                          {isNext ? (
                            <View style={[styles.nextTag, { borderColor: alpha(blue, 0.2), backgroundColor: alpha(blue, 0.1) }]}>
                              <Text size="xs" weight="600" color={blue}>
                                {t('screens.autopilotdashboard.planNextUp').toUpperCase()}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <StepRow step={s} onToggle={onToggle} highlight={isNext || s.scheduled_date === todayIso} />
                      </View>
                    );
                  })}
                </>
              ) : null}
              <Separator />
              <Button variant="ghost" size="sm" onPress={() => generate.mutate(undefined)} disabled={generate.isPending} testID="goal-plan-regenerate">
                {generate.isPending ? building : t('screens.autopilotdashboard.planRegenerate')}
              </Button>
            </View>
          )}
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  field: { gap: 6 },
  twoCol: { flexDirection: 'row', gap: 12 },
  footerRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  sheet: { padding: 16, gap: 16 },
  centerBox: { paddingVertical: 48, alignItems: 'center' },
  centerCol: { alignItems: 'center', gap: 12 },
  gap20: { gap: 16 },
  gap6: { gap: 6 },
  badgeIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inlineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  inlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ringCenter: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ringDay: { fontSize: 36, lineHeight: 40 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  strike: { textDecorationLine: 'line-through' },
  cadence: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cadenceHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 12, paddingStart: 40 },
  dateChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sectionTitle: { letterSpacing: 0.6 },
  next: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 12 },
  track: { height: 6, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  nextTag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
});
