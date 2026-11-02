/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the timeline's parts,
 * native twins of the web `src/components/timeline/IndexSpotlightCard.tsx`
 * (score, tier, today's change, the five pillars as 0–200 bars with today's
 * change and momentum, balance, the weakest pillar's action) and
 * `TimelineRows.tsx` (moment, Index day, "Your day" digest). The influence
 * badge shows a number only when the gateway measured it.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableRow, Text, useUITheme } from '../../../ports/ui';
import { MemoryIcon, useMemoryPalette } from '../../../ports/memory';
import { navigateToWebPath } from '../../../navigation/navigate';
import { MemoryCard } from '../components';
import { useMemoryText } from '../text';
import { PILLAR_KEYS, type Momentum, type PillarKey, type TimelineDayDigest, type TimelineIndexDay, type TimelineInfluence, type TimelineMoment, type TimelineSpotlight } from '../data/timeline';

export const PILLAR_ICON: Record<PillarKey, string> = { nutrition: 'Apple', hydration: 'Droplets', exercise: 'Dumbbell', sleep: 'Moon', mental: 'Brain' };

const MAX_PILLAR = 200;

function MomentumIcon({ m }: { m: Momentum }) {
  const { t } = useMemoryText();
  const palette = useMemoryPalette();
  const { colors } = useUITheme();
  const [name, tint, label] =
    m === 'rising'
      ? ['TrendingUp', palette.success, t('timeline.momentum.rising')]
      : m === 'slipping'
        ? ['TrendingDown', palette.warning, t('timeline.momentum.slipping')]
        : ['Minus', colors.mutedForeground, t('timeline.momentum.steady')];
  return (
    <View accessible accessibilityLabel={label}>
      <MemoryIcon name={name} size={14} color={tint} />
    </View>
  );
}

export function IndexSpotlightCard({ spotlight }: { spotlight: TimelineSpotlight }) {
  const x = useMemoryText();
  const { t } = x;
  const palette = useMemoryPalette();
  const { colors } = useUITheme();
  const weakest = spotlight.balance.weakest_pillar ?? spotlight.weakest_pillar;
  const balanceText =
    spotlight.balance.penalty_pct > 0 && weakest
      ? t('timeline.balance.held_back', { pillar: x.pillarLabel(weakest), pct: x.fmtNumber(spotlight.balance.penalty_pct) })
      : t('timeline.balance.full');
  return (
    <MemoryCard
      testID="timeline-index-spotlight"
      eyebrow={t('timeline.spotlight.eyebrow')}
      eyebrowIcon="Gauge"
      title={
        <View style={styles.scoreRow}>
          <Text weight="600" style={styles.score}>
            {x.fmtNumber(spotlight.score_total)}
          </Text>
          <Text muted variant="caption">
            {x.tierLabel(spotlight.tier)}
          </Text>
          {spotlight.change_today !== 0 ? (
            <Text variant="caption" color={spotlight.change_today > 0 ? palette.success : palette.warning}>
              {t('timeline.spotlight.today', { delta: x.signed(spotlight.change_today) })}
            </Text>
          ) : null}
        </View>
      }
      meta={balanceText}
    >
      <View accessibilityLabel={t('timeline.spotlight.pillarsLabel')} style={styles.pillars}>
        {PILLAR_KEYS.map((p) => {
          const row = spotlight.pillars[p];
          const pct = Math.max(0, Math.min(100, Math.round((row.score / MAX_PILLAR) * 100)));
          return (
            <View key={p} style={styles.pillarRow} testID={`timeline-pillar-${p}`}>
              <View style={styles.pillarName}>
                <MemoryIcon name={PILLAR_ICON[p]} size={16} color={palette.pillar[p].accent} />
                <Text numberOfLines={1} style={styles.fill}>
                  {x.pillarLabel(p)}
                </Text>
              </View>
              <View style={[styles.bar, { backgroundColor: palette.pillar[p].tint }]}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: palette.pillar[p].accent }]} />
              </View>
              <View style={styles.pillarValue}>
                <Text variant="caption" muted>
                  {x.fmtNumber(row.score)}
                </Text>
                {row.change_today !== 0 ? (
                  <Text variant="caption" color={row.change_today > 0 ? palette.success : palette.warning}>
                    {x.signed(row.change_today)}
                  </Text>
                ) : null}
                <MomentumIcon m={row.momentum} />
              </View>
            </View>
          );
        })}
      </View>
      {weakest ? (
        <PressableRow onPress={() => navigateToWebPath('/health/vitana-index')} accessibilityRole="link" testID="timeline-weakest-action">
          <Text weight="600" color={colors.primary}>
            {t('timeline.spotlight.improve', { pillar: x.pillarLabel(weakest) })}
          </Text>
        </PressableRow>
      ) : null}
    </MemoryCard>
  );
}

export function InfluenceBadge({ influence }: { influence: TimelineInfluence | null }) {
  const x = useMemoryText();
  const palette = useMemoryPalette();
  const { colors } = useUITheme();
  if (!influence) return null;
  if (influence.kind === 'measured') {
    const parts = PILLAR_KEYS.filter((p) => (influence.delta_pillars?.[p] ?? 0) !== 0);
    if (parts.length === 0) return null;
    return (
      <View style={styles.influence} testID="timeline-influence-measured">
        {parts.map((p) => (
          <View key={p} style={[styles.chip, { backgroundColor: palette.pillar[p].tint }]}>
            <Text variant="caption">{x.t('timeline.influence.measured', { delta: x.signed(influence.delta_pillars?.[p] ?? 0), pillar: x.pillarLabel(p) })}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (!influence.pillar) return null;
  const p = influence.pillar;
  return (
    <View style={[styles.chip, styles.chipOutline, { borderColor: palette.pillar[p].accent }]} testID="timeline-influence-counted">
      <Text variant="caption" color={colors.mutedForeground}>
        {x.t('timeline.influence.counted', { pillar: x.pillarLabel(p) })}
      </Text>
    </View>
  );
}

function RowIcon({ name, pillar }: { name: string; pillar: PillarKey | null }) {
  const palette = useMemoryPalette();
  const { colors } = useUITheme();
  const bg = pillar ? palette.pillar[pillar].tint : colors.muted;
  const fg = pillar ? palette.pillar[pillar].accent : colors.mutedForeground;
  return (
    <View style={[styles.rowIcon, { backgroundColor: bg }]}>
      <MemoryIcon name={name} size={20} color={fg} />
    </View>
  );
}

function Row({ icon, title, meta, actions, dimmed, testID }: { icon: ReactNode; title: string; meta?: string; actions?: ReactNode; dimmed?: boolean; testID?: string }) {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: dimmed ? 0.6 : 1 }]}>
      {icon}
      <View style={styles.fill}>
        <Text weight="600">{title}</Text>
        {meta ? (
          <Text variant="caption" muted>
            {meta}
          </Text>
        ) : null}
      </View>
      {actions}
    </View>
  );
}

export function MomentRow({ item, onOpen }: { item: TimelineMoment; onOpen: (id: string) => void }) {
  const x = useMemoryText();
  const time = x.fmtDate(item.at, { hour: '2-digit', minute: '2-digit' });
  const title = x.momentTitle(item);
  return (
    <PressableRow onPress={() => onOpen(item.id)} accessibilityLabel={title} testID="timeline-moment" style={styles.pressable}>
      <Row
        icon={<RowIcon name={item.icon} pillar={item.pillar ?? item.secondary_pillar} />}
        title={title}
        meta={[time, ...x.momentFacts(item)].join(' · ')}
        actions={<InfluenceBadge influence={item.influence} />}
        dimmed={item.hidden_from_ai}
      />
    </PressableRow>
  );
}

export function IndexDayRow({ item }: { item: TimelineIndexDay }) {
  const x = useMemoryText();
  const { colors } = useUITheme();
  const parts = PILLAR_KEYS.filter((p) => (item.delta_pillars[p] ?? 0) !== 0).map((p) => `${x.pillarLabel(p)} ${x.signed(item.delta_pillars[p] ?? 0)}`);
  const title =
    item.score_total_after !== null
      ? x.t(item.delta_total >= 0 ? 'timeline.indexDay.rose' : 'timeline.indexDay.fell', { score: x.fmtNumber(item.score_total_after), delta: x.signed(item.delta_total) })
      : x.t('timeline.indexDay.changed', { delta: x.signed(item.delta_total) });
  return (
    <Row
      testID="timeline-index-day"
      icon={
        <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
          <MemoryIcon name="Gauge" size={20} color={colors.primary} />
        </View>
      }
      title={title}
      meta={parts.length ? parts.join(' · ') : item.daily_update ? x.t('timeline.indexDay.dailyUpdate') : undefined}
    />
  );
}

export function DigestRow({ item }: { item: TimelineDayDigest }) {
  const x = useMemoryText();
  const { colors } = useUITheme();
  const top = Object.entries(item.counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, n]) => `${x.t(`timeline.topic.${topic}`)} ${x.fmtNumber(n)}×`);
  return (
    <Row
      testID="timeline-day-digest"
      icon={
        <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
          <MemoryIcon name="Sun" size={20} color={colors.mutedForeground} />
        </View>
      }
      title={x.t('timeline.digest.title', { n: x.fmtNumber(item.total) })}
      meta={top.join(' · ')}
    />
  );
}

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 },
  score: { fontSize: 24, lineHeight: 30 },
  pillars: { gap: 8 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillarName: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 120 },
  bar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pillarValue: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 56, justifyContent: 'flex-end' },
  fill: { flex: 1 },
  influence: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: 140 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipOutline: { borderWidth: 1 },
  rowIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 10, alignSelf: 'stretch' },
  pressable: { alignSelf: 'stretch' },
});
