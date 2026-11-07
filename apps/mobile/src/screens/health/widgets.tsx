/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the overview
 * widgets of the mobile-web /health dashboard, 1:1 twins of
 * `src/components/health/mobile/MobileHealthSnapshot.tsx`,
 * `MobilePriorityFocus.tsx`, `MobileAutopilotGuidance.tsx` and
 * `src/components/health/VitanaPillarAgentsPanel.tsx`. Colours from the
 * theme and `@vitana/tokens` (via src/ports/health); RTL-safe (logical
 * start/end only); every string from the catalogs.
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Text, useUITheme } from '../../ports/ui';
import { HealthIcon, getVitanaIndexTier, useHealthPalette, withAlpha } from '../../ports/health';
import { radius } from '../../ports/tokens';
import { PILLAR_KEYS, useHealthText } from './text';
import { usePillarAgentOutputs } from './data/gateway';
import type { VitanaIndexPillars } from './data/vitana-index';

/** Tile order matches the Index drawer (MobileHealthSnapshot.tsx:45-51). */
export const PILLAR_EMOJI: Record<keyof VitanaIndexPillars, string> = {
  nutrition: '🥗',
  hydration: '💧',
  exercise: '💪',
  sleep: '😴',
  mental: '🧠',
};

/** The rounded bordered card the web widgets draw (`rounded-xl p-4 bg-card border border-border/60 shadow-sm`). */
export function HealthPanel({ children, style, testID }: { children: ReactNode; style?: object; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.panel, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }, style]}>
      {children}
    </View>
  );
}

/** Five pillar tiles (score / 200) on the pillar tint (the snapshot and the Index sheet share this shape). */
export function PillarTiles({ pillars, testID = 'pillar-tiles' }: { pillars: VitanaIndexPillars; testID?: string }): ReactElement {
  const palette = useHealthPalette();
  const { pillarLabel } = useHealthText();
  return (
    <View style={styles.tiles} testID={testID}>
      {PILLAR_KEYS.map((key) => (
        <View
          key={key}
          testID={`${testID}-${key}`}
          accessible
          accessibilityLabel={`${pillarLabel(key)}: ${pillars[key]}/200`}
          style={[styles.tile, { backgroundColor: palette.pillar[key].tint }]}
        >
          <Text style={styles.tileEmoji}>{PILLAR_EMOJI[key]}</Text>
          <Text size="xs" weight="600" color={palette.pillar[key].accent}>
            {String(pillars[key])}
          </Text>
          <Text muted style={styles.tiny}>
            /200
          </Text>
        </View>
      ))}
    </View>
  );
}

/** The 128 px Index circle (score / 999) the snapshot and the sheet both draw. */
export function IndexCircle({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={label} style={[styles.circle, { backgroundColor: withAlpha(colors.statusSuccess, 0.3) }]}>
      <Text weight="700" color={colors.statusSuccess} style={styles.score}>
        {value}
      </Text>
      <Text size="xs" muted>
        {t('screens.health.text999')}
      </Text>
    </View>
  );
}

export function MobileHealthSnapshot({
  vitanaIndex,
  vitanaPercentile,
  trend,
  pillars,
}: {
  vitanaIndex: number;
  vitanaPercentile?: number;
  trend: 'up' | 'down' | 'stable';
  pillars: VitanaIndexPillars;
}): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const tier = getVitanaIndexTier(vitanaIndex);
  const trendIcon = trend === 'up' ? 'TrendingUp' : trend === 'down' ? 'TrendingDown' : 'Minus';
  const trendColor = trend === 'up' ? colors.statusSuccess : trend === 'down' ? colors.statusError : colors.mutedForeground;
  const trendLabel = trend === 'up' ? t('health.trend.improving') : trend === 'down' ? t('health.trend.declining') : t('health.trend.stable');
  return (
    <View style={styles.mx}>
      <HealthPanel testID="health-snapshot-card" style={styles.snapshot}>
        <Text muted style={styles.center}>
          {`🧬 ${t('health.healthSnapshot')}`}
        </Text>
        <View style={styles.snapshotBody}>
          <IndexCircle testID="health-snapshot-index" label={t('healthNative.indexAria', { score: vitanaIndex })} value={String(vitanaIndex)} />
          <View style={styles.statusRow}>
            {typeof vitanaPercentile === 'number' && Number.isFinite(vitanaPercentile) ? (
              <>
                <Text size="sm" muted testID="health-snapshot-percentile">
                  {t('health.topPercentile').replace('{percent}', String(vitanaPercentile))}
                </Text>
                <Text muted>·</Text>
              </>
            ) : null}
            <View style={styles.row}>
              <HealthIcon name={trendIcon} size={16} color={trendColor} />
              <Text size="sm" color={trendColor} testID="health-snapshot-trend">
                {trendLabel}
              </Text>
            </View>
          </View>
          <View testID="health-snapshot-tier" style={[styles.tierBadge, { backgroundColor: `${tier.color}40` }]}>
            <Text size="xs" weight="500">
              {t(tier.labelKey)}
            </Text>
          </View>
        </View>
        <PillarTiles pillars={pillars} testID="health-snapshot-pillars" />
      </HealthPanel>
    </View>
  );
}

export function MobilePriorityFocus({ pillarName, pillarScore, pillarEmoji, explanation }: { pillarName: string; pillarScore: number; pillarEmoji: string; explanation?: string }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const width = `${Math.max(0, Math.min(100, pillarScore))}%` as const;
  return (
    <View style={[styles.mx, styles.mt]} testID="health-priority-focus">
      <View style={styles.sectionHeader}>
        <HealthIcon name="Target" size={16} color={colors.primary} />
        <Text size="sm" weight="500">
          {t('health.priorityFocus')}
        </Text>
      </View>
      <HealthPanel>
        <View style={styles.focusHeader}>
          <Text style={styles.focusEmoji}>{pillarEmoji}</Text>
          <View style={styles.baseline}>
            <Text size="lg" weight="600">
              {pillarName}
            </Text>
            <Text weight="500" color={colors.statusWarning}>{`${pillarScore}%`}</Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.muted }]}>
          <View testID="health-priority-bar" style={[styles.bar, { width, backgroundColor: colors.statusWarning }]} />
        </View>
        <Text size="sm" muted>
          {explanation || t('health.priorityFocusExplanation')}
        </Text>
      </HealthPanel>
    </View>
  );
}

export function MobileAutopilotGuidance({ suggestions, onTakeAction }: { suggestions: string[]; onTakeAction: () => void }): ReactElement {
  const { colors } = useUITheme();
  const palette = useHealthPalette();
  const { t } = useHealthText();
  return (
    <View style={[styles.mx, styles.mt]} testID="health-autopilot-guidance">
      <View style={styles.sectionHeader}>
        <HealthIcon name="Plane" size={16} color={colors.primary} />
        <Text size="sm" weight="500">
          {t('health.autopilotSuggests')}
        </Text>
      </View>
      <HealthPanel>
        <View style={styles.bullets}>
          {suggestions.slice(0, 2).map((s, i) => (
            <View key={i} style={styles.bullet}>
              <Text color={palette.pillar.nutrition.accent}>•</Text>
              <Text size="sm" style={styles.fill}>
                {s}
              </Text>
            </View>
          ))}
        </View>
        <Button testID="health-take-action" onPress={onTakeAction} style={{ backgroundColor: withAlpha(colors.statusSuccess, 0.6) }}>
          {t('health.takeAction')}
        </Button>
      </HealthPanel>
    </View>
  );
}

const PILLAR_AGENT_ORDER = PILLAR_KEYS;

/** The read-only pillar-agent panel (VitanaPillarAgentsPanel.tsx:50-108). */
export function VitanaPillarAgentsPanel(): ReactElement {
  const { colors } = useUITheme();
  const { t, pillarLabel } = useHealthText();
  const { data, isLoading } = usePillarAgentOutputs();
  const outputs = data ?? [];
  const byPillar = new Map(outputs.map((o) => [o.pillar, o]));
  return (
    <Card testID="health-pillar-agents">
      <CardHeader>
        <View style={styles.between}>
          <View style={styles.row}>
            <HealthIcon name="Bot" size={20} color={colors.primary} />
            <CardTitle>{t('screens.health.activeAgents')}</CardTitle>
          </View>
          <Badge variant="outline">
            <Text style={styles.tiny}>{t('screens.health.length5RanToday', { length: outputs.length })}</Text>
          </Badge>
        </View>
      </CardHeader>
      <CardContent style={styles.agents}>
        {isLoading ? (
          <Text size="sm" muted>
            {t('screens.health.checkingAgents')}
          </Text>
        ) : null}
        {!isLoading && outputs.length === 0 ? (
          <Text size="sm" muted testID="health-pillar-agents-empty">
            {t('screens.health.noAgentOutputTodayYetFive')}
          </Text>
        ) : null}
        {!isLoading && outputs.length > 0
          ? PILLAR_AGENT_ORDER.map((p) => {
              const out = byPillar.get(p);
              const total = out ? out.subscore_baseline + out.subscore_completions + out.subscore_data + out.subscore_streak : 0;
              return (
                <View key={p} style={styles.between} testID={`health-pillar-agent-${p}`}>
                  <View style={styles.row}>
                    {out ? <HealthIcon name="CheckCircle2" size={16} color={colors.statusSuccess} /> : <View style={[styles.dashed, { borderColor: withAlpha(colors.mutedForeground, 0.4) }]} />}
                    <Text size="sm" weight="500">
                      {t('screens.health.pillarAgentValue0', { value0: pillarLabel(p) })}
                    </Text>
                  </View>
                  <Text size="xs" muted>
                    {out ? `${total}/200 · ${out.agent_version}` : t('healthNative.agents.noOutputYet')}
                  </Text>
                </View>
              );
            })
          : null}
        <Text size="xs" muted>
          {t('screens.health.eachPillarWatchedByItsOwn').replace(/\s+/g, ' ')}
        </Text>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  mx: { marginHorizontal: 16 },
  mt: { marginTop: 16 },
  panel: { borderRadius: radius.lg, borderWidth: 1, padding: 16 },
  snapshot: { borderRadius: 16 },
  center: { textAlign: 'center', marginBottom: 12 },
  snapshotBody: { alignItems: 'center', marginBottom: 12 },
  circle: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 36, lineHeight: 40 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tierBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  tiles: { flexDirection: 'row', gap: 6, marginTop: 8 },
  tile: { flex: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 2 },
  tileEmoji: { fontSize: 16, lineHeight: 20 },
  tiny: { fontSize: 10, lineHeight: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  focusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  focusEmoji: { fontSize: 24, lineHeight: 30 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 12 },
  bar: { height: 8, borderRadius: 999 },
  bullets: { gap: 8, marginBottom: 16 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fill: { flex: 1 },
  agents: { gap: 12 },
  dashed: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
});
