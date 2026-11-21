/**
 * VTID-05530 — building blocks of the calendar screen: entry card, grey busy block, milestone
 * marker and the Day / Week / Month switch. Native twin of the web's `vcal/parts.tsx`.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import type { CalendarWindowItem } from './data/api';
import { KIND_STYLE, SURFACE, entryKind, isDone } from './theme';
import { entryTitle, isMilestone, itemEmoji, sourceLabel } from './labels';
import type { CalendarView } from './time';

export function EntryCard({ item, onOpen, compact }: { item: CalendarWindowItem; onOpen: (item: CalendarWindowItem) => void; compact?: boolean }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  if (!item.event) return <BusyCard item={item} compact={compact} />;
  if (isMilestone(item)) return <MilestoneMarker item={item} onOpen={onOpen} compact={compact} />;
  const e = item.event;
  const kind = entryKind(e);
  const style = KIND_STYLE[kind];
  const done = isDone(e);
  const sub = [compact ? null : fmt.timeRange(item.start_time, item.end_time), sourceLabel(item, t) ?? t(`vcal.kinds.${kind}`)].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={entryTitle(e, t)}
      testID={`vcal-entry-${item.event_id}`}
      style={[styles.card, compact && styles.cardCompact, { borderColor: colors.border, backgroundColor: colors.card, opacity: done ? 0.7 : 1 }]}
    >
      <View style={[styles.tile, compact && styles.tileCompact, { backgroundColor: style.bg }]} importantForAccessibility="no-hide-descendants">
        <Text style={{ fontSize: compact ? 16 : 20 }}>{itemEmoji(item)}</Text>
      </View>
      <View style={styles.cardText}>
        {compact ? (
          <Text variant="caption" muted>
            {fmt.hhmm(item.start_time)}
          </Text>
        ) : null}
        <Text weight="700" numberOfLines={1} size={compact ? 'xs' : undefined} style={{ textDecorationLine: done ? 'line-through' : 'none' }}>
          {entryTitle(e, t)}
        </Text>
        {!compact ? (
          <Text variant="caption" muted numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {done && !compact ? (
        <View accessibilityLabel={t('vcal.done')} style={[styles.doneDot, { backgroundColor: KIND_STYLE.nutrition.bg }]}>
          <Text weight="700" style={{ color: KIND_STYLE.nutrition.accent }}>
            ✓
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function MilestoneMarker({ item, onOpen, compact }: { item: CalendarWindowItem; onOpen: (item: CalendarWindowItem) => void; compact?: boolean }): ReactElement {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => onOpen(item)} accessibilityRole="button" testID={`vcal-milestone-${item.event_id}`} style={styles.milestone}>
      <Text>🏁</Text>
      <Text variant="caption" muted numberOfLines={1} size={compact ? 'xs' : undefined}>
        {t('vcal.milestone', { title: item.event?.title ?? '' })}
      </Text>
    </Pressable>
  );
}

export function BusyCard({ item, compact }: { item: CalendarWindowItem; compact?: boolean }): ReactElement {
  const { t } = useI18n();
  const fmt = useFormat();
  const google = item.source === 'google';
  const label = t(google ? 'vcal.google.busy' : 'vcal.busy');
  return (
    <View
      accessible
      accessibilityLabel={t(google ? 'vcal.google.busyHint' : 'vcal.busyHint')}
      testID={`vcal-busy-${item.event_id}`}
      style={[styles.busy, compact && styles.busyCompact, { backgroundColor: SURFACE.busyBg, borderColor: SURFACE.line }]}
    >
      <Text>{google ? '📆' : '🔒'}</Text>
      <Text variant="caption" numberOfLines={1} style={{ color: SURFACE.busyInk, flexShrink: 1 }}>
        {`${compact ? `${fmt.hhmm(item.start_time)} · ` : ''}${label}${compact ? '' : ` · ${fmt.timeRange(item.start_time, item.end_time)}`}`}
      </Text>
    </View>
  );
}

export function ViewSwitch({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const views: CalendarView[] = ['day', 'week', 'month'];
  return (
    <View accessibilityRole="tablist" accessibilityLabel={t('vcal.title')} style={[styles.switch, { backgroundColor: SURFACE.track }]} testID="vcal-view-switch">
      {views.map((v) => {
        const active = v === view;
        return (
          <Pressable
            key={v}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`vcal.views.${v}`)}
            onPress={() => onChange(v)}
            testID={`vcal-view-${v}`}
            style={[styles.switchItem, active && { backgroundColor: colors.card }]}
          >
            <Text weight={active ? '700' : '400'} style={{ color: active ? colors.foreground : SURFACE.muted }}>
              {t(`vcal.views.${v}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  cardCompact: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  tile: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileCompact: { width: 32, height: 32, borderRadius: 12 },
  cardText: { flex: 1, minWidth: 0 },
  doneDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  busyCompact: { paddingHorizontal: 10, paddingVertical: 8 },
  switch: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4 },
  switchItem: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
