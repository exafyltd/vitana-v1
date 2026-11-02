/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) — the
 * Mission Alignment card of the Vitana Index page, a twin of
 * `src/components/health/MissionAlignmentCard.tsx`: title, subtitle and the
 * contract link; loading / error / "no recommendations" states; the served
 * summary, one bar per pillar (+ "no pillar") and per economic axis
 * (+ "no economic axis"), each `count (pct%)`. The pillar bars use the
 * pillar accent tokens (`--pill-<pillar>-accent`); the economy bars the
 * warning token (web `bg-amber-500`). The width of a bar animates over 200 ms
 * like the web `transition-[width] duration-200`. Reads only (a GET).
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { Animated, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Card, CardContent, CardHeader, Spinner, Text, useUITheme } from '../../../ports/ui';
import { useHealthPalette, withAlpha } from '../../../ports/health';
import { BiologyIcon } from '../../../ports/health-biology';
import { useHealthText } from '../text';
import { aggregate, ECONOMIC_AXES, PILLAR_ORDER, useMissionAlignment, type RecommendationRow } from './data';

/** MissionAlignmentCard.tsx:60. */
export const CONTRACT_URL = 'https://github.com/exafyltd/vitana-platform/blob/main/docs/GOVERNANCE/ULTIMATE-GOAL.md';

function BarRow({ label, count, total, color, testID }: { label: string; count: number; total: number; color: string; testID: string }): ReactElement {
  const { colors } = useUITheme();
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: pct, duration: 200, useNativeDriver: false }).start();
  }, [pct, width]);
  return (
    <View style={styles.barRow} testID={testID}>
      <Text size="sm" muted numberOfLines={1} style={styles.barLabel}>
        {label}
      </Text>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <Animated.View style={[styles.fillBar, { backgroundColor: color, width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <View style={styles.barValue}>
        <Text size="sm">{`${count} (${pct}%)`}</Text>
      </View>
    </View>
  );
}

function Body({ rows }: { rows: RecommendationRow[] }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t } = useHealthText();
  const agg = aggregate(rows);
  const servedPct = agg.total > 0 ? Math.round((agg.served / agg.total) * 100) : 0;
  const none = withAlpha(colors.mutedForeground, 0.4);
  return (
    <View style={styles.body} testID="mission-alignment-body">
      <View style={[styles.summary, { borderColor: colors.border, backgroundColor: withAlpha(colors.muted, 0.3) }]}>
        <Text size="sm" weight="500">
          {t('screens.health.missionAlignment.summaryServed', { pct: servedPct })}
        </Text>
        <Text size="sm" muted>
          {t('screens.health.missionAlignment.summaryServedCount', { served: agg.served, total: agg.total })}
        </Text>
      </View>
      <View>
        <Text size="sm" weight="600" style={styles.heading}>
          {t('screens.health.missionAlignment.pillarHeading')}
        </Text>
        {PILLAR_ORDER.map((p) => (
          <BarRow
            key={p}
            testID={`mission-pillar-${p}`}
            label={t(`screens.health.missionAlignment.pillars.${p}`)}
            count={agg.pillarCounts[p]}
            total={agg.total}
            color={palette.pillar[p].accent}
          />
        ))}
        <BarRow testID="mission-pillar-none" label={t('screens.health.missionAlignment.noPillar')} count={agg.pillarCounts.none} total={agg.total} color={none} />
      </View>
      <View>
        <Text size="sm" weight="600" style={styles.heading}>
          {t('screens.health.missionAlignment.economyHeading')}
        </Text>
        {ECONOMIC_AXES.map((axis) => (
          <BarRow
            key={axis}
            testID={`mission-economy-${axis}`}
            label={t(`screens.health.missionAlignment.economyAxes.${axis}`)}
            count={agg.economyCounts[axis]}
            total={agg.total}
            color={colors.statusWarning}
          />
        ))}
        <BarRow testID="mission-economy-none" label={t('screens.health.missionAlignment.noEconomy')} count={agg.economyCounts.none} total={agg.total} color={none} />
      </View>
    </View>
  );
}

export function MissionAlignmentCard(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  // isPending (not isLoading): the card shows its loading row until the first answer, also while the session is restored.
  const { data: rows, isPending, isError } = useMissionAlignment();
  return (
    <Card testID="mission-alignment">
      <CardHeader>
        <View style={styles.headerRow}>
          <View style={styles.fill}>
            <Text size="lg" weight="600" accessibilityRole="header">
              {t('screens.health.missionAlignment.title')}
            </Text>
            <Text size="sm" muted style={styles.mt}>
              {t('screens.health.missionAlignment.subtitle')}
            </Text>
          </View>
          <Pressable testID="mission-alignment-contract" accessibilityRole="link" onPress={() => void Linking.openURL(CONTRACT_URL)} style={styles.link}>
            <Text size="xs" color={colors.primary}>
              {t('screens.health.missionAlignment.contractLink')}
            </Text>
            <BiologyIcon name="ExternalLink" size={12} color={colors.primary} />
          </Pressable>
        </View>
      </CardHeader>
      <CardContent>
        {isPending && !isError ? (
          <View style={styles.loading} testID="mission-alignment-loading">
            <Spinner accessibilityLabel={t('screens.health.missionAlignment.loading')} />
            <Text size="sm" muted>
              {t('screens.health.missionAlignment.loading')}
            </Text>
          </View>
        ) : isError ? (
          <Text size="sm" color={colors.destructive} testID="mission-alignment-error">
            {t('screens.health.missionAlignment.error')}
          </Text>
        ) : rows && rows.length > 0 ? (
          <Body rows={rows} />
        ) : (
          <Text size="sm" muted testID="mission-alignment-empty">
            {t('screens.health.missionAlignment.noRecs')}
          </Text>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
  mt: { marginTop: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { gap: 20 },
  summary: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 2 },
  heading: { marginBottom: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  barLabel: { width: 128 },
  track: { flex: 1, height: 10, borderRadius: 999, overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: 999 },
  barValue: { width: 72, alignItems: 'flex-end' },
});
