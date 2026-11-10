/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the two health widgets the
 * companion sidebar stacks, twins of the web `card` variants:
 *
 *  - `VitanaIndexMini` — `src/components/health/VitanaIndexMini.tsx`: tap →
 *    `/health/my-health-tracker`, reward dot (score / 10), the score + trend,
 *    the tier label (the active `vitana_index_config.scoring_tiers`, else the
 *    built-in tier), the kit Progress (score / 999) and the nutrition /
 *    exercise / sleep pillar scores from the member's Index.
 *  - `AutopilotWidget` — `src/components/health/AutopilotWidget.tsx`: reward
 *    dot, Active / Paused badge, the settings button (`/settings/autopilot`),
 *    the switch, the suggestions (only when `user_preferences.autopilot_enabled`)
 *    or the empty state.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Badge, Button, IconButton, Switch, Text, useUITheme } from '../../../ports/ui';
import { CoachIcon, Progress, useCoachPalette } from '../../../ports/ai-coach';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useCoachText } from '../text';
import { RewardDot } from '../components';
import { tierLabelKey, useUserPreferences, useVitanaIndex, useVitanaIndexConfig } from '../data/hooks';

/** The `w-8 h-8 rounded-lg bg-gradient-to-r from-calendar-primary to-calendar-secondary` icon tile. */
export function GradientTile({ icon, round = false, id }: { icon: string; round?: boolean; id: string }) {
  const { colors } = useUITheme();
  const p = useCoachPalette();
  return (
    <View style={styles.tile}>
      <Svg width={32} height={32} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={p.calendarPrimary} />
            <Stop offset="1" stopColor={p.calendarSecondary} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={32} height={32} rx={round ? 16 : 8} fill={`url(#${id})`} />
      </Svg>
      <CoachIcon name={icon} size={16} color={colors.primaryForeground} />
    </View>
  );
}

export function VitanaIndexMini({ score: override, trend: trendOverride, testID = 'card-vitana-index-mini' }: { score?: number; trend?: 'up' | 'down' | 'stable'; testID?: string }) {
  const { t, fmtNumber } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const { index, isLoading } = useVitanaIndex();
  const { config } = useVitanaIndexConfig();
  const score = override ?? index?.total ?? 0;
  const trend = trendOverride ?? index?.trend ?? 'stable';
  const computing = isLoading || (!index && override === undefined);
  const tier = config?.scoring_tiers?.find((x) => score >= x.min && score <= x.max);
  const label = computing ? t('aiCoachNative.index.computing') : (tier?.label ?? t(tierLabelKey(score)));
  const pillars: Array<['nutrition' | 'exercise' | 'sleep', number]> = [
    ['nutrition', index?.pillars.nutrition ?? 0],
    ['exercise', index?.pillars.exercise ?? 0],
    ['sleep', index?.pillars.sleep ?? 0],
  ];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.health.vitanaIndexValue0', { value0: computing ? '…' : score })}
      onPress={() => navigateToWebPath('/health/my-health-tracker')}
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <RewardDot points={Math.floor(score / 10)} description={t('aiCoachNative.reward.index')} testID={`${testID}-reward`} />
      <View style={[styles.header, styles.between]}>
        <View style={styles.row}>
          <GradientTile icon="Activity" id="coachIndexMiniTile" />
          <Text size="lg" weight="600">
            {t('screens.health.vitanaIndex')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text size="2xl" weight="700" testID={`${testID}-score`}>
            {computing ? '…' : fmtNumber(score)}
          </Text>
          {trend === 'up' ? <CoachIcon name="TrendingUp" size={20} color={p.calendarSuccess} /> : null}
          {trend === 'down' ? <CoachIcon name="TrendingDown" size={20} color={colors.destructive} /> : null}
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.between}>
          <Text size="sm" muted>
            {t('screens.health.overallHealth')}
          </Text>
          <Text size="sm" weight="500" testID={`${testID}-tier`}>
            {label}
          </Text>
        </View>
        <Progress value={Math.round((score / 999) * 100)} style={styles.bar} />
        <View style={styles.pillars}>
          {pillars.map(([k, v]) => (
            <View key={k} style={styles.pillar}>
              <Text size="xs" weight="500" testID={`${testID}-${k}`}>
                {fmtNumber(v)}
              </Text>
              <Text size="xs" muted>
                {t(`screens.health.${k}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export function AutopilotWidget({ suggestions, isEnabled = false, onToggle, onAction, testID = 'card-autopilot-widget' }: { suggestions: string[]; isEnabled?: boolean; onToggle?: (on: boolean) => void; onAction?: (s: string) => void; testID?: string }) {
  const { t } = useCoachText();
  const { colors } = useUITheme();
  const p = useCoachPalette();
  const { preferences } = useUserPreferences();
  const enabled = preferences?.autopilot_enabled ?? isEnabled;
  const shown = preferences?.autopilot_enabled ? suggestions : [];
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: p.alpha(p.calendarPrimary, 0.2) }]}>
      <RewardDot points={suggestions.length > 0 ? 10 : 3} description={t(suggestions.length > 0 ? 'autopilot.widget.completeForRewards' : 'autopilot.widget.enableForCredits')} testID={`${testID}-reward`} />
      <View style={[styles.header, styles.between]}>
        <View style={styles.row}>
          <GradientTile icon="Plane" id="coachAutopilotTile" />
          <Text size="lg" weight="600">
            {t('autopilot.widget.title')}
          </Text>
        </View>
        <View style={styles.row}>
          <Badge variant={enabled ? 'default' : 'secondary'} testID={`${testID}-state`}>
            {t(enabled ? 'autopilot.widget.active' : 'autopilot.widget.paused')}
          </Badge>
          <IconButton name="Settings" accessibilityLabel={t('aiCoachNative.autopilot.settings')} onPress={() => navigateToWebPath('/settings/autopilot')} testID={`${testID}-settings`} />
          <Switch checked={enabled} onCheckedChange={onToggle} accessibilityLabel={t('aiCoachNative.autopilot.toggle')} testID={`${testID}-switch`} />
        </View>
      </View>
      <View style={styles.content}>
        {shown.map((s) => (
          <View key={s} style={[styles.suggestion, { backgroundColor: p.alpha(colors.background, 0.5) }]}>
            <View style={[styles.row, styles.shrink]}>
              <CoachIcon name="Brain" size={16} color={p.calendarPrimary} />
              <Text size="sm" style={styles.shrink}>
                {s}
              </Text>
            </View>
            <Button size="sm" variant="ghost" onPress={() => onAction?.(s)}>
              {t('autopilot.widget.doNow')}
            </Button>
          </View>
        ))}
        {shown.length === 0 ? (
          <View style={styles.empty} testID={`${testID}-empty`}>
            <CoachIcon name="Brain" size={32} color={p.alpha(colors.mutedForeground, 0.5)} />
            <Text size="sm" muted>
              {t(preferences?.autopilot_enabled ? 'autopilot.widget.allOptimized' : 'autopilot.widget.enableToSee')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 8 },
  header: { padding: 24, paddingBottom: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  tile: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 8 },
  pillars: { flexDirection: 'row', gap: 8 },
  pillar: { flex: 1, alignItems: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, gap: 8 },
  shrink: { flexShrink: 1 },
  empty: { alignItems: 'center', paddingVertical: 16, gap: 8 },
});
