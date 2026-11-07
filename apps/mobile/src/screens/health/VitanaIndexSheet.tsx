/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Vitana Index
 * overlay (`OVERLAY.VITANA_INDEX /health`), a twin of
 * `src/components/health/VitanaIndexSheet.tsx`: the side sheet with the
 * growth / first-open-of-the-day banner, Today (Index circle, tier, 7-day
 * delta, balance, streak, pillar tiles, "Understand index"), Next few days
 * (pending Autopilot actions and their pillar lift, "Open Autopilot"), the
 * 30-day horizon chart and the Life Compass link.
 *
 * Opened by the `vitana:open-index` bus event (the web window event of the
 * same name; the snapshot, the chip and the ORB's `vitana_index` directive
 * emit it). Mounted by the screen that shows the chip (the /health dashboard
 * here; other lanes mount it through src/ports/health-data.ts).
 *
 * Differences, recorded: the web fires a confetti burst on the first open of
 * the day (VitanaIndexSheet.tsx:258-273); the native app has no confetti
 * canvas, so only the banner shows (the day is still marked, in
 * AsyncStorage instead of localStorage). The web streak is a localStorage
 * day log nothing writes natively, so it is 0 (no streak badge, no streak
 * banner copy). The web banner and Life Compass copy is hard-coded English;
 * here it comes from `healthNative.sheet.*` in all 11 locales.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Path } from 'react-native-svg';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import {
  HealthButtonIcon,
  HealthIcon,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  buildHorizonPoints,
  useHealthPalette,
  withAlpha,
  type ProjectedPoint,
} from '../../ports/health';
import { useBusEvent } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';
import { PILLAR_KEYS, useHealthText } from './text';
import { useVitanaIndex } from './data/vitana-index';
import { useAutopilotPending, type ContributionVector, type PendingAction } from './data/gateway';
import { useLifeCompass } from './data/records';
import { IndexCircle, PillarTiles } from './widgets';
import { VITANA_INDEX_OPEN_EVENT, openAutopilot, openLifeCompass } from './events';

export const GROWTH_CONFETTI_DAY_KEY = 'vitana:index-drawer:celebrated';

export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The web pickKeepGoingMessage (VitanaIndexSheet.tsx:39-47) as a catalog key + params. */
export function keepGoingMessage(delta: number, streak: number): { key: string; params: Record<string, number> } {
  const k = (name: string) => `healthNative.sheet.keepGoing.${name}`;
  if (delta >= 20) return { key: k('huge'), params: { delta } };
  if (delta >= 10) return { key: k('roll'), params: { delta } };
  if (delta > 0 && streak >= 7) return { key: k('streakWeek'), params: { streak, delta } };
  if (delta > 0 && streak >= 3) return { key: k('streakDays'), params: { streak, delta } };
  if (delta > 0) return { key: k('up'), params: { delta } };
  if (streak >= 7) return { key: k('habits'), params: { streak } };
  return { key: k('streak'), params: { streak } };
}

export const DAILY_ENCOURAGEMENT_COUNT = 5;

export function sevenDayDelta(history: Array<{ date: string; score: number }>): number | null {
  if (history.length < 2) return null;
  return history[history.length - 1].score - history[0].score;
}

export function sumVectors(actions: Array<{ contributionVector?: ContributionVector }>): { vector: ContributionVector; total: number } {
  const vector: ContributionVector = {};
  let total = 0;
  for (const a of actions) {
    if (!a.contributionVector) continue;
    for (const [k, v] of Object.entries(a.contributionVector) as Array<[keyof ContributionVector, number | undefined]>) {
      if (typeof v === 'number' && v > 0) {
        vector[k] = (vector[k] ?? 0) + v;
        total += v;
      }
    }
  }
  return { vector, total };
}

function HorizonChart({ points }: { points: ProjectedPoint[] }): ReactElement | null {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  if (points.length === 0) return null;
  const W = 100;
  const H = 28;
  const minDay = points[0].day;
  const dayRange = Math.max(1, points[points.length - 1].day - minDay);
  const minScore = Math.min(...points.map((p) => p.score));
  const scoreRange = Math.max(20, Math.max(...points.map((p) => p.score)) - minScore);
  const toX = (day: number) => ((day - minDay) / dayRange) * W;
  const toY = (score: number) => H - ((score - minScore) / scoreRange) * H;
  const solid = points.filter((p) => !p.isProjection);
  const projection = points.filter((p) => p.isProjection);
  const lastSolid = solid[solid.length - 1];
  const solidPath = solid.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`).join(' ');
  const projectionPath =
    lastSolid && projection.length > 0
      ? `M${toX(lastSolid.day).toFixed(2)},${toY(lastSolid.score).toFixed(2)} ` + projection.map((p) => `L${toX(p.day).toFixed(2)},${toY(p.score).toFixed(2)}`).join(' ')
      : null;
  const projectedScore = points[points.length - 1].score;
  return (
    <View style={styles.gapSm} testID="vitana-index-horizon-chart">
      <View accessible accessibilityRole="image" accessibilityLabel={t('healthNative.sheet.horizonAria', { score: projectedScore })} style={styles.chart}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {solidPath ? <Path d={solidPath} fill="none" stroke={colors.foreground} strokeWidth={0.7} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {projectionPath ? <Path d={projectionPath} fill="none" stroke={colors.mutedForeground} strokeWidth={0.6} strokeDasharray="1 1" /> : null}
          {lastSolid ? <Circle cx={toX(lastSolid.day)} cy={toY(lastSolid.score)} r={1.1} fill={colors.statusSuccess} stroke={colors.background} strokeWidth={0.3} /> : null}
        </Svg>
      </View>
      <Text size="xs" muted>
        {`${t('screens.health.atThisPaceYouLandAround')} `}
        <Text size="xs" weight="700">
          {String(projectedScore)}
        </Text>
        {` ${t('screens.health.text30Days')}`}
      </Text>
    </View>
  );
}

/** PillarDeltaBadges compact (PillarDeltaBadges.tsx:29-59): pillars with a positive lift, largest first. */
function PillarDeltaBadges({ vector }: { vector: ContributionVector }): ReactElement | null {
  const palette = useHealthPalette();
  const { t, pillarLabel } = useHealthText();
  const entries = PILLAR_KEYS.map((p) => [p, vector[p]] as const)
    .filter((e): e is readonly [(typeof PILLAR_KEYS)[number], number] => typeof e[1] === 'number' && e[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return (
    <View style={styles.wrapRow} accessibilityLabel={t('screens.health.vitanaIndexPillarImpact')} testID="vitana-index-pillar-deltas">
      {entries.map(([p, v]) => (
        <View key={p} style={[styles.delta, { backgroundColor: palette.pillar[p].tint, borderColor: withAlpha(palette.pillar[p].accent, 0.4) }]}>
          <Text color={palette.pillar[p].accent} style={styles.tiny}>{`${pillarLabel(p).slice(0, 4)} +${v}`}</Text>
        </View>
      ))}
    </View>
  );
}

export function VitanaIndexSheet(): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t, rtl } = useHealthText();
  const [open, setOpen] = useState(false);
  const { index, isLoading } = useVitanaIndex();
  const { pendingActions } = useAutopilotPending();
  const { data: compass } = useLifeCompass();
  const streakDays = 0;

  useBusEvent(VITANA_INDEX_OPEN_EVENT, () => setOpen(true));

  const total = index?.total ?? null;
  const tierLabel = index?.tier ? t(index.tier.labelKey) : null;
  const tierFraming = index?.tier ? t(index.tier.framingKey) : null;
  const balanceFactor = index?.balanceFactor ?? null;
  const delta = index?.history ? sevenDayDelta(index.history) : null;
  const hasGrowth = (delta !== null && delta > 0) || streakDays >= 3;

  // null = not read yet (AsyncStorage is async; the web reads localStorage synchronously).
  const [celebratedToday, setCelebratedToday] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(GROWTH_CONFETTI_DAY_KEY)
      .then((v) => live && setCelebratedToday(v === todayKey()))
      .catch(() => live && setCelebratedToday(false));
    return () => {
      live = false;
    };
  }, []);
  const [dailyPick] = useState(() => Math.floor(Math.random() * DAILY_ENCOURAGEMENT_COUNT));
  const isFirstOpenToday = celebratedToday === false;
  const banner = useMemo(() => {
    if (!(hasGrowth || isFirstOpenToday)) return null;
    if (hasGrowth) {
      const m = keepGoingMessage(delta ?? 0, streakDays);
      return t(m.key, m.params);
    }
    return t(`healthNative.sheet.daily.${dailyPick}`);
  }, [hasGrowth, isFirstOpenToday, delta, dailyPick, t]);

  // Mark the day on the first open (the web writes the key when the sheet opens).
  useEffect(() => {
    if (!open || celebratedToday !== false) return;
    void AsyncStorage.setItem(GROWTH_CONFETTI_DAY_KEY, todayKey()).catch(() => undefined);
  }, [open, celebratedToday]);

  const { vector, total: nextDaysTotal } = useMemo(() => sumVectors(pendingActions as PendingAction[]), [pendingActions]);
  const horizonPoints = useMemo(() => buildHorizonPoints(index?.history ?? []), [index?.history]);

  const close = (then: () => void) => {
    setOpen(false);
    then();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" testID="vitana-index-sheet">
        <ScrollView contentContainerStyle={styles.body}>
          <SheetHeader>
            <SheetTitle>{t('screens.health.yourIndex')}</SheetTitle>
            {tierLabel ? <SheetDescription>{tierFraming ?? tierLabel}</SheetDescription> : null}
          </SheetHeader>

          {banner ? (
            <View
              testID="vitana-index-banner"
              accessibilityRole="text"
              accessibilityLiveRegion="polite"
              style={[
                styles.banner,
                hasGrowth
                  ? { borderColor: withAlpha(colors.statusSuccess, 0.3), backgroundColor: withAlpha(colors.statusSuccess, 0.1) }
                  : { borderColor: withAlpha(palette.category[2], 0.3), backgroundColor: withAlpha(palette.category[2], 0.1) },
              ]}
            >
              <View style={[styles.bannerIcon, { backgroundColor: withAlpha(colors.background, 0.6) }]}>
                <HealthIcon name="PartyPopper" size={20} color={hasGrowth ? colors.statusSuccess : palette.category[2]} />
              </View>
              <Text size="sm" weight="500" style={styles.fill}>
                {banner}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text size="xs" weight="600" muted style={styles.eyebrow} accessibilityRole="header">
              {t('screens.health.today')}
            </Text>
            <View style={styles.centerRow}>
              <IndexCircle
                testID="vitana-index-sheet-score"
                label={isLoading || total === null ? t('healthNative.indexLoadingAria') : t('healthNative.indexAria', { score: total })}
                value={isLoading || total === null ? '…' : String(total)}
              />
            </View>
            <View style={styles.badges}>
              {tierLabel ? (
                <Badge variant="secondary" testID="vitana-index-sheet-tier">
                  <Text size="sm">{tierLabel}</Text>
                </Badge>
              ) : null}
              {delta !== null && delta !== 0 ? (
                <Badge variant="outline" testID="vitana-index-sheet-delta">
                  <Text size="xs">{t('screens.health.value0SevendaydeltaThisWeek', { value0: delta > 0 ? '+' : '', sevenDayDelta: delta })}</Text>
                </Badge>
              ) : null}
              {balanceFactor !== null ? (
                <Badge variant="outline" testID="vitana-index-sheet-balance">
                  <Text size="xs">{t('screens.health.balanceValue0', { value0: Math.round(balanceFactor * 100) })}</Text>
                </Badge>
              ) : null}
            </View>
            {index?.pillars ? <PillarTiles pillars={index.pillars} testID="vitana-index-sheet-pillars" /> : null}
            <Pressable
              testID="vitana-index-sheet-understand"
              accessibilityRole="button"
              onPress={() => close(() => navigateToWebPath('/health/vitana-index'))}
              style={[styles.understand, { backgroundColor: withAlpha(palette.category[0], 0.1), borderColor: withAlpha(palette.category[0], 0.15) }]}
            >
              <Text size="sm" weight="600" color={palette.category[0]}>
                {t('profile.identity.understandIndex')}
              </Text>
              <View style={rtl ? styles.flip : undefined}>
                <HealthIcon name="ChevronRight" size={16} color={palette.category[0]} />
              </View>
            </Pressable>
          </View>

          <Separator />

          <View style={styles.section}>
            <Text size="xs" weight="600" muted style={styles.eyebrow} accessibilityRole="header">
              {t('screens.health.nextFewDays')}
            </Text>
            {pendingActions.length === 0 ? (
              <Text size="sm" muted testID="vitana-index-next-empty">
                {t('empty.indexSheetNextDays')}
              </Text>
            ) : (
              <View style={styles.gapSm}>
                <Text size="sm" testID="vitana-index-next-summary">
                  {t('screens.health.completeLengthActionValue1AutopilotSuggests', { length: pendingActions.length, value1: pendingActions.length === 1 ? '' : 's' })}
                  {nextDaysTotal > 0 ? (
                    <>
                      {' → '}
                      <Text size="sm" weight="700" color={colors.statusSuccess}>{`+${nextDaysTotal}`}</Text>
                    </>
                  ) : null}
                  .
                </Text>
                {nextDaysTotal > 0 ? <PillarDeltaBadges vector={vector} /> : null}
                <Button testID="vitana-index-open-autopilot" onPress={openAutopilot} style={{ backgroundColor: colors.statusError }}>
                  <HealthButtonIcon name="Zap" />
                  {t('screens.health.openAutopilot')}
                </Button>
              </View>
            )}
          </View>

          <Separator />

          <View style={styles.section}>
            <View style={styles.row}>
              <HealthIcon name="Sparkles" size={12} color={colors.mutedForeground} />
              <Text size="xs" weight="600" muted style={styles.eyebrow} accessibilityRole="header">
                {t('screens.health.text30dayHorizon')}
              </Text>
            </View>
            {horizonPoints.length === 0 ? (
              <Text size="sm" muted testID="vitana-index-horizon-empty">
                {t('empty.indexSheetHorizon')}
              </Text>
            ) : (
              <HorizonChart points={horizonPoints} />
            )}
          </View>

          <Separator />

          <Pressable testID="vitana-index-sheet-compass" accessibilityRole="button" onPress={() => close(openLifeCompass)}>
            <Text size="sm" muted>
              {compass?.primary_goal ? t('healthNative.sheet.compassGoal', { goal: compass.primary_goal }) : t('healthNative.sheet.compassSet')}
            </Text>
          </Pressable>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 24, paddingBottom: 24 },
  section: { gap: 16 },
  gapSm: { gap: 12 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  centerRow: { alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerIcon: { padding: 8, borderRadius: 999 },
  fill: { flex: 1 },
  understand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  delta: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 6 },
  tiny: { fontSize: 10, lineHeight: 16 },
  chart: { width: '100%', height: 80 },
  flip: { transform: [{ scaleX: -1 }] },
});
