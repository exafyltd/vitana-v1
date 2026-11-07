/**
 * VTID-05461 — "How you're doing" on My Journey (AutopilotDashboard.tsx
 * :400-410): the demoted Vitana Index card (`IndexNowCard`, :112-156 — total,
 * tier, 7-day trend via the core `trend7d`) and the Index trajectory card
 * (twin of `src/components/health/VitanaIndexTrajectoryCard.tsx`: range chips
 * 7d / 30d / 90d, best / worst / average / 7-day stats, the chart with tier
 * bands, the 600 goal line, the 90-day projection and markers, the insight
 * line and "what drives my index"). Tapping the Index circle or the footer
 * emits `vitana:open-index` on the overlay bus, the web's
 * `VITANA_INDEX_OPEN_EVENT` (the Index sheet is another lane's overlay).
 * The chart is react-native-svg; tier-band and line colours are tokens.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Spinner, Text, useUITheme } from '../../ports/ui';
import { alpha, JourneyIcon, trend7d, useToneColor, getVitanaIndexTier } from '../../ports/journey';
import { overlayBus } from '../../navigation/overlay-bus';
import { useAuth } from '../../auth/AuthProvider';
import { useJourneyText } from './text';
import { useMyJourney } from './data/journey';
import { useVitanaIndex, useVitanaIndexHistory } from './data/supabase';
import { Eyebrow, JourneyCard } from './components';

export const VITANA_INDEX_OPEN_EVENT = 'vitana:open-index';
const openIndex = () => overlayBus.emit(VITANA_INDEX_OPEN_EVENT);

export function IndexNowCard(): ReactElement {
  const { t } = useJourneyText();
  const { colors } = useUITheme();
  const { index } = useVitanaIndex();
  const total = index?.total ?? null;
  const tier = index?.tier ?? null;
  const trend = index?.history ? trend7d(index.history) : null;
  const trendLabel =
    trend === null
      ? null
      : trend > 0
        ? { icon: 'TrendingUp', text: t('screens.autopilotdashboard.trendUpThisWeek', { delta: trend }), color: colors.statusSuccess }
        : trend < 0
          ? { icon: 'TrendingDown', text: t('screens.autopilotdashboard.trendDownThisWeek', { delta: trend }), color: colors.statusError }
          : { icon: 'TrendingUp', text: t('screens.autopilotdashboard.trendSteadyThisWeek'), color: colors.mutedForeground };
  return (
    <JourneyCard testID="journey-index-now">
      <View style={styles.row}>
        <Pressable
          testID="journey-index-open"
          accessibilityRole="button"
          accessibilityLabel={t('screens.autopilotdashboard.openIndexDrawerAria')}
          onPress={openIndex}
          style={[styles.indexCircle, { backgroundColor: alpha(colors.statusSuccess, 0.3) }]}
        >
          <Text size="2xl" weight="700" color={colors.statusSuccess} testID="journey-index-total">
            {total === null ? '…' : String(total)}
          </Text>
          <Text size="xs" muted>
            {t('screens.autopilotdashboard.text999')}
          </Text>
        </Pressable>
        <View style={styles.flex}>
          <Text size="xs" muted style={styles.track}>
            {t('screens.autopilotdashboard.yourIndex').toUpperCase()}
          </Text>
          {tier ? <Text weight="600">{t(tier.labelKey)}</Text> : null}
          {trendLabel ? (
            <View style={styles.inline} testID="journey-index-trend">
              <JourneyIcon name={trendLabel.icon} size={12} color={trendLabel.color} />
              <Text size="xs" color={trendLabel.color}>
                {trendLabel.text}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </JourneyCard>
  );
}

const JOURNEY_TOTAL_DAYS = 90;
const GOAL_SCORE = 600;
type Range = '7d' | '30d' | '90d';
const RANGES: ReadonlyArray<{ key: Range; labelKey: string }> = [
  { key: '7d', labelKey: 'screens.health.range7d' },
  { key: '30d', labelKey: 'screens.health.range30d' },
  { key: '90d', labelKey: 'screens.health.range90d' },
];
interface Point {
  day: number;
  score: number;
  date: string;
}

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  const reg = new Date(iso).getTime();
  if (Number.isNaN(reg)) return 0;
  return Math.max(0, Math.floor((Date.now() - reg) / 86400000));
}

export function VitanaIndexTrajectoryCard(): ReactElement {
  const { t, fmtDate, fmtNumber } = useJourneyText();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const blue = useToneColor('category-3');
  const pink = useToneColor('category-4');
  const { user } = useAuth();
  const { index, isLoading: indexLoading } = useVitanaIndex();
  const { data: myJourney } = useMyJourney();
  const [range, setRange] = useState<Range>('30d');
  const [chartWidth, setChartWidth] = useState(0);
  const fetchDays = range === '90d' ? JOURNEY_TOTAL_DAYS : range === '30d' ? 30 : 7;
  const { history, isLoading: historyLoading } = useVitanaIndexHistory(fetchDays);
  const dayNumber = myJourney?.journey?.day_in_journey ?? daysSince((user as { created_at?: string } | null)?.created_at);
  const points = useMemo<Point[]>(() => history.map((h, i) => ({ day: i, score: h.score, date: h.date })), [history]);
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const scores = points.map((p) => p.score);
    const best = points.reduce((a, b) => (b.score > a.score ? b : a));
    const worst = points.reduce((a, b) => (b.score < a.score ? b : a));
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const tail = scores.slice(-7);
    const trend = tail.length > 1 ? tail[tail.length - 1] - tail[0] : 0;
    return { best, worst, avg, trend };
  }, [points]);
  const projectionEnd = useMemo(() => {
    if (range !== '90d' || points.length < 2) return null;
    const tail = points.slice(-7);
    const first = tail[0];
    const last = tail[tail.length - 1];
    const slope = last.day !== first.day ? (last.score - first.score) / (last.day - first.day) : 0;
    const remainingDays = Math.max(0, JOURNEY_TOTAL_DAYS - dayNumber);
    if (remainingDays <= 0) return null;
    return { day: last.day + remainingDays, score: Math.max(0, Math.min(999, Math.round(last.score + slope * remainingDays))) };
  }, [points, range, dayNumber]);

  if (indexLoading || historyLoading) {
    return (
      <JourneyCard testID="journey-trajectory-loading">
        <View style={styles.loading}>
          <Spinner accessibilityLabel={t('common.loading')} />
        </View>
      </JourneyCard>
    );
  }
  if (!index || points.length === 0) {
    return (
      <JourneyCard testID="journey-trajectory-empty">
        <Text size="sm" muted>
          {t('screens.health.yourVitanaIndexTrajectoryWillAppear')}
        </Text>
      </JourneyCard>
    );
  }

  const W = Math.max(1, chartWidth);
  const H = 180;
  const padX = 4;
  const raw = points.map((p) => p.score);
  if (projectionEnd) raw.push(projectionEnd.score);
  const dataMin = Math.min(...raw);
  const dataMax = Math.max(...raw);
  const pad = Math.max(40, Math.round((dataMax - dataMin) * 0.25));
  const yMin = Math.max(0, Math.floor((dataMin - pad) / 50) * 50);
  let yMax = Math.min(999, Math.ceil((dataMax + pad) / 50) * 50);
  if (yMax - yMin < 100) yMax = Math.min(999, yMin + 100);
  const xMaxDay = projectionEnd ? projectionEnd.day : Math.max(1, points[points.length - 1].day);
  const xMinDay = points[0].day;
  const toX = (d: number) => padX + ((d - xMinDay) / Math.max(1, xMaxDay - xMinDay)) * (W - 2 * padX);
  const toY = (s: number) => H - ((s - yMin) / (yMax - yMin)) * H;
  const buildPath = (pts: Point[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${toX(pts[0].day).toFixed(2)} ${toY(pts[0].score).toFixed(2)}`;
    let d = `M ${toX(pts[0].day).toFixed(2)} ${toY(pts[0].score).toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (toX(p0.day) + toX(p1.day)) / 2;
      const my = (toY(p0.score) + toY(p1.score)) / 2;
      d += ` Q ${toX(p0.day).toFixed(2)} ${toY(p0.score).toFixed(2)}, ${mx.toFixed(2)} ${my.toFixed(2)}`;
    }
    const last = pts[pts.length - 1];
    return `${d} T ${toX(last.day).toFixed(2)} ${toY(last.score).toFixed(2)}`;
  };
  const linePath = buildPath(points);
  const lastPt = points[points.length - 1];
  const areaPath = `${linePath} L ${toX(lastPt.day).toFixed(2)} ${H} L ${toX(points[0].day).toFixed(2)} ${H} Z`;
  // Tier bands: the tier table's bounds, filled with the success token at rising alpha (web emerald/amber ramp).
  const bandFill = [colors.statusError, colors.statusWarning, colors.statusWarning, colors.statusSuccess, colors.statusSuccess, colors.statusSuccess];
  const bandAlpha = [0.12, 0.2, 0.12, 0.15, 0.25, 0.35];
  const bands = [
    [0, 99],
    [100, 299],
    [300, 499],
    [500, 599],
    [600, 799],
    [800, 999],
  ]
    .map(([min, max], i) => {
      const top = Math.max(yMin, min);
      const bot = Math.min(yMax, max);
      return bot <= top ? null : { fill: alpha(bandFill[i], bandAlpha[i]), yTop: toY(bot), yBot: toY(top) };
    })
    .filter((b): b is { fill: string; yTop: number; yBot: number } => !!b);
  const showBest = stats && stats.best.day !== lastPt.day;
  const showWorst = stats && stats.worst.day !== lastPt.day && stats.worst.day !== stats.best.day;
  const goalInRange = GOAL_SCORE >= yMin && GOAL_SCORE <= yMax;
  const xAxisLabels = (() => {
    if (range === '90d') {
      return [t('screens.health.dayN', { n: 0 }), t('screens.health.dayN', { n: 30 }), t('screens.health.todayWithDay', { day: dayNumber }), t('screens.health.dayN', { n: 90 })];
    }
    const start = new Date(points[0].date);
    const end = new Date(lastPt.date);
    const mid1 = new Date(start.getTime() + (end.getTime() - start.getTime()) * 0.33);
    const mid2 = new Date(start.getTime() + (end.getTime() - start.getTime()) * 0.66);
    const f = (d: Date) => fmtDate(d, { day: 'numeric', month: 'short' });
    return [f(start), f(mid1), f(mid2), t('screens.health.today')];
  })();
  const trend = stats?.trend ?? 0;
  const insight = trend > 3 ? t('screens.health.insightUp', { delta: Math.abs(trend) }) : trend < -3 ? t('screens.health.insightDown', { delta: Math.abs(trend) }) : t('screens.health.insightFlat');
  const tier = getVitanaIndexTier(index.total);
  const statBox = (value: string, label: string, color?: string, testID?: string) => (
    <View style={[styles.stat, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.border, 0.6) }]} testID={testID}>
      <Text size="sm" weight="700" color={color}>
        {value}
      </Text>
      <Text size="xs" muted>
        {label.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <JourneyCard testID="journey-trajectory">
      <View style={styles.gap12}>
        <View style={styles.between}>
          <View style={[styles.inline, styles.flex]}>
            <JourneyIcon name="TrendingUp" size={16} color={violet} />
            <Text size="sm" weight="600" numberOfLines={1}>
              {t('screens.health.vitanaIndexTrajectory')}
            </Text>
          </View>
          <View style={styles.endCol}>
            <Text size="xl" editorial weight="600" color={colors.statusSuccess}>
              {String(index.total)}
            </Text>
            <Text size="xs" weight="600" muted>
              {`${t('screens.health.todayDot')} ${t(tier.labelKey)}`.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.inline}>
          {RANGES.map((r) => {
            const on = range === r.key;
            return (
              <Pressable
                key={r.key}
                testID={`journey-range-${r.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setRange(r.key)}
                style={[styles.rangeChip, { backgroundColor: on ? blue : colors.card, borderColor: on ? blue : colors.border }]}
              >
                <Text size="xs" weight="600" color={on ? colors.primaryForeground : colors.mutedForeground}>
                  {t(r.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {stats ? (
          <View style={styles.stats}>
            {statBox(String(stats.best.score), t('screens.health.statBest'), colors.statusSuccess, 'journey-stat-best')}
            {statBox(String(stats.worst.score), t('screens.health.statWorst'), colors.statusWarning)}
            {statBox(String(stats.avg), t('screens.health.statAverage'))}
            {statBox(
              `${trend > 0 ? '↑ +' : trend < 0 ? '↓ ' : '→ '}${fmtNumber(Math.abs(trend))}`,
              t('screens.health.stat7d'),
              trend > 0 ? colors.statusSuccess : trend < 0 ? colors.statusError : colors.mutedForeground,
            )}
          </View>
        ) : null}
        <View style={styles.chartRow}>
          <View style={[styles.yAxis, { height: H }]}>
            <Text size="xs" weight="600" muted>
              {String(yMax)}
            </Text>
            <Text size="xs" weight="600" muted>
              {String(Math.round((yMin + yMax) / 2))}
            </Text>
            <Text size="xs" weight="600" muted>
              {String(yMin)}
            </Text>
          </View>
          <View style={styles.flex} onLayout={(e: LayoutChangeEvent) => setChartWidth(e.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={t('screens.health.trajectoryAria', { today: index.total })}>
            {chartWidth > 0 ? (
              <Svg width={W} height={H}>
                <Defs>
                  <LinearGradient id="vitanaLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={colors.statusSuccess} />
                    <Stop offset="50%" stopColor={blue} />
                    <Stop offset="100%" stopColor={pink} />
                  </LinearGradient>
                  <LinearGradient id="vitanaFillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={blue} stopOpacity={0.32} />
                    <Stop offset="100%" stopColor={blue} stopOpacity={0.02} />
                  </LinearGradient>
                </Defs>
                {bands.map((b, i) => (
                  <Rect key={i} x={0} y={b.yTop} width={W} height={Math.max(0, b.yBot - b.yTop)} fill={b.fill} />
                ))}
                {goalInRange ? (
                  <>
                    <Line x1={0} y1={toY(GOAL_SCORE)} x2={W} y2={toY(GOAL_SCORE)} stroke={colors.statusSuccess} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7} />
                    <SvgText x={4} y={toY(GOAL_SCORE) - 3} fontSize={9} fontWeight="700" fill={colors.statusSuccess}>
                      {t('screens.health.goalLineLabel', { goal: GOAL_SCORE })}
                    </SvgText>
                  </>
                ) : null}
                <Path d={areaPath} fill="url(#vitanaFillGrad)" />
                <Path d={linePath} fill="none" stroke="url(#vitanaLineGrad)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                {projectionEnd ? (
                  <>
                    <Line x1={toX(lastPt.day)} y1={toY(lastPt.score)} x2={toX(projectionEnd.day)} y2={toY(projectionEnd.score)} stroke={violet} strokeWidth={1.8} strokeDasharray="4 3" strokeLinecap="round" />
                    <Circle cx={toX(projectionEnd.day)} cy={toY(projectionEnd.score)} r={3.5} fill={colors.card} stroke={violet} strokeWidth={2} />
                  </>
                ) : null}
                {showWorst && stats ? <Circle cx={toX(stats.worst.day)} cy={toY(stats.worst.score)} r={3.5} fill={colors.statusWarning} stroke={colors.card} strokeWidth={2} /> : null}
                {showBest && stats ? <Circle cx={toX(stats.best.day)} cy={toY(stats.best.score)} r={3.5} fill={colors.statusSuccess} stroke={colors.card} strokeWidth={2} /> : null}
                <Circle cx={toX(lastPt.day)} cy={toY(lastPt.score)} r={8} fill={blue} opacity={0.18} />
                <Circle cx={toX(lastPt.day)} cy={toY(lastPt.score)} r={4.5} fill={blue} stroke={colors.card} strokeWidth={2.5} />
              </Svg>
            ) : (
              <View style={{ height: H }} />
            )}
            <View style={styles.xAxis}>
              {xAxisLabels.map((l, i) => (
                <Text key={i} size="xs" weight="600" muted>
                  {l}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <View style={[styles.insight, { borderColor: alpha(colors.statusSuccess, 0.1), backgroundColor: alpha(colors.statusSuccess, 0.06) }]}>
          <Text>✨</Text>
          <Text size="xs" color={colors.statusSuccess} style={styles.flex} testID="journey-trajectory-insight">
            {insight}
          </Text>
        </View>
        <Pressable testID="journey-trajectory-drivers" accessibilityRole="button" onPress={openIndex} style={styles.between}>
          <Text size="xs" muted>
            {t('screens.health.lastNDays', { days: fetchDays })}
          </Text>
          <View style={styles.inline}>
            <Text size="xs" weight="600" color={blue}>
              {t('screens.health.whatDrivesIndex')}
            </Text>
            <JourneyIcon name="ChevronRight" size={14} color={blue} />
          </View>
        </Pressable>
      </View>
    </JourneyCard>
  );
}

export function HowYoureDoing(): ReactElement {
  const { t } = useJourneyText();
  return (
    <View style={styles.section} testID="journey-how-youre-doing">
      <Eyebrow>{t('screens.autopilotdashboard.howYoureDoing')}</Eyebrow>
      <IndexNowCard />
      <VitanaIndexTrajectoryCard />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  gap12: { gap: 12 },
  track: { letterSpacing: 0.6 },
  indexCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  loading: { paddingVertical: 32, alignItems: 'center' },
  endCol: { alignItems: 'flex-end' },
  rangeChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' },
  chartRow: { flexDirection: 'row', gap: 4 },
  yAxis: { width: 28, justifyContent: 'space-between', alignItems: 'flex-end' },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
