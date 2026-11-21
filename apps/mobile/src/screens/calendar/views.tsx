/**
 * VTID-05530 — Day, Week and Month views of the calendar screen: native twin of the web's
 * `vcal/views.tsx`. Each view is handed the items for exactly its own range (see `viewRange`).
 * A view never floods: a week column shows its first WEEK_LIMIT entries and "+N more"; a month cell
 * up to three dots; milestones are quiet markers and never count. In the Week and the Month a
 * tapped day opens a panel in place with the day's entries and a button to add one for that day.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import type { CalendarWindowItem } from './data/api';
import { KIND_STYLE, SURFACE, entryKind } from './theme';
import { EntryCard } from './parts';
import { isMilestone, itemsOn } from './labels';
import { addDays, dayKey, sameDay, viewRange } from './time';

type Open = (item: CalendarWindowItem) => void;

export const DAY_LIMIT = 5;
export const WEEK_LIMIT = 3;
export const MONTH_DOTS = 3;

export function EmptyDay(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]} testID="vcal-empty">
      <Text weight="700">{t('vcal.empty.title')}</Text>
      <Text variant="caption" muted style={styles.center}>
        {t('vcal.empty.hint')}
      </Text>
    </View>
  );
}

function MoreButton({ count, onPress }: { count: number; onPress: () => void }): ReactElement {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="vcal-more" style={styles.more}>
      <Text weight="700" style={{ color: SURFACE.link }}>
        {t('vcal.more', { count })}
      </Text>
    </Pressable>
  );
}

function TimedRow({ item, onOpen }: { item: CalendarWindowItem; onOpen: Open }): ReactElement {
  const fmt = useFormat();
  return (
    <View style={styles.timedRow}>
      <Text variant="caption" muted style={styles.timeCol}>
        {fmt.hhmm(item.start_time)}
      </Text>
      <View style={styles.flex}>
        <EntryCard item={item} onOpen={onOpen} />
      </View>
    </View>
  );
}

export function DayView({ items, onOpen, summary }: { items: CalendarWindowItem[]; onOpen: Open; summary?: string }): ReactElement {
  const [all, setAll] = useState(false);
  const markers = items.filter(isMilestone);
  const entries = items.filter((i) => !isMilestone(i));
  const shown = all ? entries : entries.slice(0, DAY_LIMIT);
  const hidden = entries.length - shown.length;
  return (
    <View style={styles.stack} testID="vcal-day">
      {summary ? (
        <Text muted testID="vcal-summary">
          {summary}
        </Text>
      ) : null}
      {markers.map((m) => (
        <EntryCard key={m.id} item={m} onOpen={onOpen} />
      ))}
      {entries.length === 0 ? <EmptyDay /> : shown.map((item) => <TimedRow key={item.id} item={item} onOpen={onOpen} />)}
      {hidden > 0 ? <MoreButton count={hidden} onPress={() => setAll(true)} /> : null}
    </View>
  );
}

/** The panel a tapped day opens in the Week and the Month: the day's whole list and a button that opens the add sheet for that day. */
export function DayPanel({ day, items, onOpen, onAdd, onClose }: { day: Date; items: CalendarWindowItem[]; onOpen: Open; onAdd: (d: Date) => void; onClose: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const dayItems = itemsOn(items, day);
  const markers = dayItems.filter(isMilestone);
  const entries = dayItems.filter((i) => !isMilestone(i));
  const label = fmt.fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortLabel = fmt.fmtDate(day, { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <View accessibilityRole="summary" accessibilityLabel={label} style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.card }]} testID="vcal-day-panel">
      <View style={styles.panelHeader}>
        <Text weight="700" size="lg" numberOfLines={1} style={styles.flex}>
          {label}
        </Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('vcal.entry.close')} testID="vcal-day-panel-close" hitSlop={8} style={[styles.closeBtn, { borderColor: colors.border }]}>
          <Text>✕</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => onAdd(day)} accessibilityRole="button" testID="vcal-add-day" style={[styles.addDay, { backgroundColor: SURFACE.track }]}>
        <Text weight="700">＋</Text>
        <Text weight="600" numberOfLines={1} style={styles.flex}>
          {t('vcal.day.addFor', { date: shortLabel })}
        </Text>
      </Pressable>
      {markers.map((m) => (
        <EntryCard key={m.id} item={m} onOpen={onOpen} />
      ))}
      {entries.length === 0 ? (
        <Text variant="caption" muted testID="vcal-day-panel-empty">
          {t('vcal.empty.title')}
        </Text>
      ) : (
        entries.map((item) => <TimedRow key={item.id} item={item} onOpen={onOpen} />)
      )}
    </View>
  );
}

export function WeekView({ anchor, items, now, onOpen, onAdd }: { anchor: Date; items: CalendarWindowItem[]; now: Date; onOpen: Open; onAdd: (d: Date) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const { from } = viewRange('week', anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const toggle = (d: Date) => setOpenDay((cur) => (cur && sameDay(cur, d) ? null : d));
  return (
    <View style={styles.stack} testID="vcal-week">
      {days.map((day, index) => {
        const dayItems = itemsOn(items, day).filter((i) => !isMilestone(i));
        const isToday = sameDay(day, now);
        const isOpen = !!openDay && sameDay(openDay, day);
        const hidden = dayItems.length - WEEK_LIMIT;
        return (
          <View key={day.toISOString()} style={styles.stack}>
            <View
              accessibilityLabel={fmt.fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
              style={[styles.weekDay, { borderColor: isToday || isOpen ? SURFACE.today : colors.border, backgroundColor: colors.card, borderWidth: isOpen ? 2 : 1 }]}
              testID={`vcal-week-day-${index}`}
            >
              <Pressable onPress={() => toggle(day)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} testID={`vcal-week-toggle-${index}`} style={styles.weekDayHead}>
                <Text variant="caption" style={{ color: SURFACE.muted }}>
                  {fmt.formatDate(day, 'EEE')}
                </Text>
                <Text size="lg" weight={isToday ? '700' : '400'} style={isToday ? { color: SURFACE.today } : undefined}>
                  {fmt.formatDate(day, 'd')}
                </Text>
              </Pressable>
              {dayItems.length ? (
                <View style={styles.compactList}>
                  {dayItems.slice(0, WEEK_LIMIT).map((item) => (
                    <EntryCard key={item.id} item={item} onOpen={onOpen} compact />
                  ))}
                  {hidden > 0 ? <MoreButton count={hidden} onPress={() => toggle(day)} /> : null}
                </View>
              ) : (
                <Text variant="caption" style={{ color: SURFACE.faint }}>
                  {t('vcal.week.free')}
                </Text>
              )}
            </View>
            {isOpen ? <DayPanel day={day} items={items} onOpen={onOpen} onAdd={onAdd} onClose={() => setOpenDay(null)} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const WEEKDAY_REF = new Date(2024, 0, 1); // a Monday, only used to name the columns

export function MonthView({ anchor, items, now, onOpen, onAdd }: { anchor: Date; items: CalendarWindowItem[]; now: Date; onOpen: Open; onAdd: (d: Date) => void }): ReactElement {
  const { colors } = useUITheme();
  const fmt = useFormat();
  const { from } = viewRange('month', anchor);
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  const month = anchor.getMonth();
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const toggle = (d: Date) => setOpenDay((cur) => (cur && sameDay(cur, d) ? null : d));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return (
    <View style={styles.stack}>
      <View style={[styles.month, { borderColor: colors.border, backgroundColor: colors.card }]} testID="vcal-month">
        <View style={styles.monthRow}>
          {Array.from({ length: 7 }, (_, i) => (
            <Text key={i} variant="caption" style={[styles.monthCell, { color: SURFACE.faint }]}>
              {fmt.formatDate(addDays(WEEKDAY_REF, i), 'EEEEEE')}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week[0].toISOString()} style={styles.monthRow}>
            {week.map((day) => {
              const dayItems = itemsOn(items, day).filter((i) => i.event && !isMilestone(i));
              const inMonth = day.getMonth() === month;
              const isToday = sameDay(day, now);
              const isOpen = !!openDay && sameDay(openDay, day);
              return (
                <Pressable
                  key={day.toISOString()}
                  onPress={() => toggle(day)}
                  accessibilityRole="button"
                  accessibilityLabel={fmt.fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                  accessibilityState={{ expanded: isOpen }}
                  testID={`vcal-month-day-${dayKey(day)}`}
                  style={[styles.monthCell, styles.monthDay, isOpen && { borderColor: SURFACE.today, borderWidth: 2 }]}
                >
                  <View style={[styles.dayNum, isToday && { backgroundColor: SURFACE.today }]}>
                    <Text size="sm" weight={isToday ? '700' : '400'} style={{ color: isToday ? '#FFFFFF' : inMonth ? colors.foreground : SURFACE.faint }}>
                      {fmt.formatDate(day, 'd')}
                    </Text>
                  </View>
                  <View style={styles.dots} importantForAccessibility="no-hide-descendants">
                    {dayItems.slice(0, MONTH_DOTS).map((i) => (
                      <View key={i.id} style={[styles.dot, { backgroundColor: KIND_STYLE[entryKind(i.event!)].accent }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      {openDay ? <DayPanel day={openDay} items={items} onOpen={onOpen} onAdd={onAdd} onClose={() => setOpenDay(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  empty: { borderWidth: 1, borderRadius: 20, paddingVertical: 28, paddingHorizontal: 16, alignItems: 'center', gap: 4 },
  more: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingVertical: 6 },
  timedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timeCol: { width: 56, paddingTop: 14 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addDay: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16, minHeight: 44 },
  weekDay: { borderRadius: 24, padding: 12, gap: 8 },
  weekDayHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  compactList: { gap: 6 },
  month: { borderWidth: 1, borderRadius: 20, padding: 8, gap: 4 },
  monthRow: { flexDirection: 'row', gap: 4 },
  monthCell: { flex: 1, textAlign: 'center' },
  monthDay: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12, padding: 2 },
  dayNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', height: 6, gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
