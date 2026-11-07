/**
 * VTID-05456 (native-wave2-health-biology-r3/health-plans-services) — the
 * card shapes the five web plan views repeat (src/components/health/<pillar>/):
 * the "Your <pillar> plan powered by Autopilot" overview card
 * (`*OverviewCard.tsx`: header + AI Optimized badge, three metric tiles, the
 * consistency bar, the AI insight box, Recalibrate Plan and its helper line),
 * the weekly dashboard tiles (`*Dashboard.tsx` / `ProgressDashboard.tsx`), the
 * consistency ring, the recovery-impact row, the quoted AI summary box and the
 * empty state (`*EmptyState.tsx`). Each view fills them with the same keys and
 * values as its web twin. "Recalibrate Plan" only logs on the web
 * (e.g. ExercisePlanView.tsx:29-31), so it does nothing here.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Badge, Button, Text, useUITheme } from '../../../../ports/ui';
import { HealthIcon, Progress, useHealthPalette } from '../../../../ports/health-plans';
import { useI18n } from '../../../../i18n/I18nProvider';
import { healthStyles } from '../components';

export type Tile = { icon: string; iconColor: string; label: string; value: string; sub?: string };

const noop = () => undefined;

export function PlanCard({ children, testID, tint }: { children: ReactNode; testID?: string; tint?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: tint ?? colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function OverviewCard({
  title,
  subtitle,
  headerIcon,
  badgeIcon = 'Sparkles',
  tiles,
  progressLabel,
  percent,
  percentColor,
  insight,
  insightIcon,
  insightLabel = true,
  quoted = true,
  lastUpdated,
  recalibrateIcon = 'Sparkles',
  helper,
  testID,
}: {
  title: string;
  subtitle: string;
  headerIcon?: { name: string; color: string };
  badgeIcon?: string;
  tiles: readonly Tile[];
  progressLabel: string;
  percent: number;
  percentColor?: string;
  insight: string;
  insightIcon: { name: string; color: string };
  insightLabel?: boolean;
  quoted?: boolean;
  lastUpdated?: string;
  recalibrateIcon?: string;
  helper?: string;
  testID: string;
}) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <PlanCard testID={testID}>
      <View style={styles.headerRow}>
        <View style={healthStyles.fill}>
          <View style={healthStyles.row}>
            {headerIcon ? <HealthIcon name={headerIcon.name} size={20} color={headerIcon.color} /> : null}
            <Text size="xl" weight="700" style={healthStyles.fill} accessibilityRole="header">
              {title}
            </Text>
          </View>
          <Text size="sm" muted style={styles.sub}>
            {subtitle}
          </Text>
        </View>
        <Badge variant="secondary">
          <View style={styles.badgeInner}>
            <HealthIcon name={badgeIcon} size={12} color={colors.secondaryForeground} />
            <Text size="xs" weight="600">
              {t('screens.health.aiOptimized')}
            </Text>
          </View>
        </Badge>
      </View>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={[styles.tile, { backgroundColor: colors.background }]}>
            <View style={healthStyles.row}>
              <HealthIcon name={tile.icon} size={16} color={tile.iconColor} />
              <Text size="xs" weight="500" muted>
                {tile.label}
              </Text>
            </View>
            <Text size="lg" weight="700">
              {tile.value}
            </Text>
            {tile.sub ? (
              <Text size="xs" muted>
                {tile.sub}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View style={styles.progress}>
        <View style={healthStyles.between}>
          <Text size="sm" weight="500" muted={!percentColor} style={healthStyles.fill}>
            {progressLabel}
          </Text>
          {percentColor ? (
            <Text size="sm" weight="700" color={percentColor}>
              {`${percent}%`}
            </Text>
          ) : null}
        </View>
        <Progress value={percent} style={styles.progressBar} />
      </View>
      <View style={[styles.insight, { borderColor: colors.border }]}>
        <HealthIcon name={insightIcon.name} size={20} color={insightIcon.color} />
        <View style={healthStyles.fill}>
          {insightLabel ? (
            <View style={healthStyles.between}>
              <Text size="sm" weight="500">
                {t('screens.health.aiInsight')}
              </Text>
              {lastUpdated ? (
                <Text size="xs" muted>
                  {t('screens.health.lastUpdatedLastupdated', { lastUpdated })}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text size="sm" muted style={quoted ? styles.italic : undefined}>
            {quoted ? `"${insight}"` : insight}
          </Text>
          {!insightLabel && lastUpdated ? (
            <Text size="xs" muted>
              {t('screens.health.lastUpdatedLastupdated', { lastUpdated })}
            </Text>
          ) : null}
        </View>
      </View>
      <Button variant="outline" onPress={noop} testID={`${testID}-recalibrate`}>
        <View style={healthStyles.row}>
          <HealthIcon name={recalibrateIcon} size={16} color={colors.foreground} />
          <Text size="sm" weight="500">
            {t('screens.health.recalibratePlan')}
          </Text>
        </View>
      </Button>
      {helper ? (
        <Text size="xs" muted style={styles.center}>
          {helper}
        </Text>
      ) : null}
    </PlanCard>
  );
}

/** A dashboard metric: icon (or a ring), the big value, its label and an optional trend badge. */
export function StatTile({ icon, iconColor, value, label, badge, ring }: { icon?: string; iconColor?: string; value?: string; label: string; badge?: string; ring?: { percent: number; color: string } }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.background }]}>
      {ring ? <Ring percent={ring.percent} color={ring.color} /> : icon ? <HealthIcon name={icon} size={24} color={iconColor} /> : null}
      {value !== undefined ? (
        <Text size="2xl" weight="700">
          {value}
        </Text>
      ) : null}
      <Text size="xs" muted style={styles.center}>
        {label}
      </Text>
      {badge ? (
        <Badge variant="outline">
          <View style={styles.badgeInner}>
            <HealthIcon name="TrendingUp" size={12} color={colors.foreground} />
            <Text size="xs">{badge}</Text>
          </View>
        </Badge>
      ) : null}
    </View>
  );
}

/** The web's SVG consistency ring (r = 32 of an 80 px box, 6 px stroke) with the percentage inside. */
export function Ring({ percent, color }: { percent: number; color: string }) {
  const { colors } = useUITheme();
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={80} height={80} style={styles.ringSvg}>
        <Circle cx={40} cy={40} r={r} fill="none" stroke={colors.mutedForeground} strokeWidth={6} />
        <Circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${(percent / 100) * c} ${c}`} />
      </Svg>
      <View style={styles.ringLabel}>
        <Text size="lg" weight="700" color={color}>
          {`${percent}%`}
        </Text>
      </View>
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

/** The dashboards' recovery-impact row (CheckCircle2 + label, the value badge, a helper line). */
export function RecoveryImpact({ value, helper }: { value: string; helper: string }) {
  const { t } = useI18n();
  const palette = useHealthPalette();
  const { colors } = useUITheme();
  return (
    <View style={[styles.impact, { backgroundColor: palette.successSubtle, borderColor: colors.border }]}>
      <View style={healthStyles.between}>
        <View style={healthStyles.row}>
          <HealthIcon name="CheckCircle2" size={20} color={palette.success} />
          <Text size="sm" weight="500">
            {t('screens.health.recoveryImpact')}
          </Text>
        </View>
        <Badge style={{ backgroundColor: palette.success }}>{value}</Badge>
      </View>
      <Text size="xs" muted>
        {helper}
      </Text>
    </View>
  );
}

/** The quoted AI summary box at the foot of a dashboard. */
export function AiSummary({ text, iconColor, label }: { text: string; iconColor: string; label?: string }) {
  const { colors } = useUITheme();
  return (
    <View style={[styles.insight, { borderColor: colors.border }]}>
      <HealthIcon name="Brain" size={20} color={iconColor} />
      <View style={healthStyles.fill}>
        {label ? (
          <Text size="sm" weight="500">
            {label}
          </Text>
        ) : null}
        <Text size="sm" muted style={label ? undefined : styles.italic}>
          {label ? text : `"${text}"`}
        </Text>
      </View>
    </View>
  );
}

/**
 * `*EmptyState.tsx`: icon, title, description and the Generate Plan button.
 * The button calls `generatePlan.mutate` (the `generate-personalized-plan`
 * edge function) on the web; the reads-only twin shows it disabled (plan
 * decision 3a).
 */
export function PlanEmptyState({ icon, iconColor, title, description, testID }: { icon: string; iconColor: string; title: string; description: string; testID: string }) {
  const { t } = useI18n();
  return (
    <PlanCard testID={testID}>
      <View style={styles.empty}>
        <HealthIcon name={icon} size={40} color={iconColor} />
        <Text size="xl" weight="600" style={styles.center}>
          {title}
        </Text>
        <Text muted style={styles.center}>
          {description}
        </Text>
        <Button size="lg" disabled accessibilityState={{ disabled: true }} testID={`${testID}-generate`}>
          {t('health.emptyStates.generatePlan')}
        </Button>
      </View>
    </PlanCard>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <Text size="lg" weight="600" accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sub: { marginTop: 4 },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tiles: { gap: 12 },
  tile: { borderRadius: 12, padding: 16, gap: 6 },
  progress: { gap: 8 },
  progressBar: { height: 12 },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 12, padding: 16 },
  italic: { fontStyle: 'italic' },
  center: { textAlign: 'center' },
  stat: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', borderRadius: 12, padding: 16, gap: 6 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ring: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringLabel: { alignItems: 'center', justifyContent: 'center' },
  impact: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  empty: { alignItems: 'center', gap: 16, paddingVertical: 32 },
});
