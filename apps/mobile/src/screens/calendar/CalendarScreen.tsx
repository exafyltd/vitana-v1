/**
 * VTID-05530 (native-wave2-events-calendar-r3/calendar-reminders) — native port of the mobile web
 * calendar (`src/pages/Calendar.tsx`, the phone branch) at `/calendar`, and of the deep link
 * `/calendar/entry/:entryId` (the same screen with `entryId`).
 *
 * Day, week and month views over `GET /api/v1/calendar/events/window`: the active role's entries in
 * colour, every other role's as grey busy blocks (time only). A tapped entry opens full-screen
 * (`EntryScreen`); "+" opens the add-entry sheet. `/calendar/entry/:id` jumps to that entry's day
 * (a read of the member's own `calendar_events` row, RLS-scoped) and opens it; closing it returns to
 * `/calendar`.
 *
 * Not ported in this lane (listed in the PR body): the Spotlight desktop layout, the enrichment card
 * strip, the day guide card, the journey / work / calendars folding sections, the connect-a-calendar
 * card, the subscribe sheet, share to the feed and the invite sheet. The reminders section is a link
 * to the native reminders screen.
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Skeleton, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useRole } from '../../identity/useRole';
import { getSupabase } from '../../auth/client';
import { deviceStorage } from '../../identity/device-storage';
import { navigateToWebPath } from '../../navigation/navigate';
import { useFormat } from './useFormat';
import {
  cancelCalendarEntry,
  completeCalendarEntry,
  fetchCalendarWindow,
  moveBlockReasonOf,
  moveCalendarEntry,
  topPillarGain,
  updateCalendarEntry,
  type CalendarEntryPatch,
  type CalendarWindowItem,
  type MoveBlockReason,
} from './data/api';
import { SURFACE, isDone } from './theme';
import { ViewSwitch } from './parts';
import { DayView, MonthView, WeekView } from './views';
import { EntryScreen } from './EntryScreen';
import { AddEntrySheet } from './AddEntrySheet';
import { isMilestone } from './labels';
import { sameDay, stepAnchor, viewRange, type CalendarView } from './time';

const VIEW_KEY = 'vitana.calendar.view';

const MOVE_BLOCKED_KEY: Record<MoveBlockReason, string> = {
  cancelled: 'vcal.move.blocked.cancelled',
  completed: 'vcal.move.blocked.completed',
  recurring: 'vcal.move.blocked.recurring',
  owned_by_source: 'vcal.move.blocked.owned_by_source',
};

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function CalendarScreen({ entryId }: { entryId?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const { dbRole } = useRole();
  const role = dbRole ?? null;
  const now = useNow();

  const [view, setView] = useState<CalendarView>('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [openItem, setOpenItem] = useState<CalendarWindowItem | null>(null);
  // The day the add sheet is open for (null = closed). Adding never moves the shown week or month.
  const [addFor, setAddFor] = useState<Date | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(entryId ?? null);
  const [entryMissing, setEntryMissing] = useState(false);

  // The last view the member used (a per-device convenience, the web keeps it in localStorage).
  useEffect(() => {
    if (entryId) return undefined;
    let live = true;
    void Promise.resolve(deviceStorage.getItem(VIEW_KEY)).then((v: string | null) => {
      if (live && (v === 'week' || v === 'month')) setView(v);
    });
    return () => {
      live = false;
    };
  }, [entryId]);

  const changeView = (v: CalendarView) => {
    setView(v);
    void deviceStorage.setItem(VIEW_KEY, v);
  };

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const query = useQuery({
    queryKey: ['calendar-window', role, range.from.toISOString(), range.to.toISOString()],
    queryFn: () => fetchCalendarWindow(range.from, range.to, role),
    staleTime: 30_000,
  });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  // /calendar/entry/:id — jump to that entry's day, then open it. Read-only: the member's own row (RLS), only to learn which day to show.
  useEffect(() => {
    if (!entryId) return undefined;
    setPendingEntryId(entryId);
    setEntryMissing(false);
    let cancelled = false;
    void Promise.resolve(getSupabase().from('calendar_events').select('start_time').eq('id', entryId).maybeSingle())
      .then(({ data }: { data: { start_time?: string } | null }) => {
        if (cancelled) return;
        if (!data?.start_time) {
          setEntryMissing(true);
          return;
        }
        setAnchor(new Date(data.start_time));
        setView('day');
      })
      .catch(() => {
        if (!cancelled) setEntryMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entryId]);

  useEffect(() => {
    if (!pendingEntryId || !query.isSuccess) return;
    const hit = items.find((i) => i.event_id === pendingEntryId && i.event);
    if (hit) {
      setOpenItem(hit);
      setPendingEntryId(null);
    }
  }, [pendingEntryId, query.isSuccess, items]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['calendar-window'] });

  const complete = useMutation({
    mutationFn: (item: CalendarWindowItem) => completeCalendarEntry(item.event_id, role),
    onSuccess: (result) => {
      // Say what it did for the Vitana Index, when it moved.
      const gain = topPillarGain(result?.vitana_index ?? null);
      if (gain) {
        notify('vcal.doneToast', 'vcal.indexGain', { points: fmt.fmtNumber(gain.points, { maximumFractionDigits: 1 }), pillar: t(`vcal.kinds.${gain.pillar}`) });
      } else {
        notify('vcal.doneToast');
      }
      setOpenItem(null);
      void refresh();
    },
    onError: () => notifyError('vcal.doneError'),
  });

  const move = useMutation({
    mutationFn: ({ item, start }: { item: CalendarWindowItem; start: Date }) => moveCalendarEntry(item.event_id, start, role),
    onSuccess: () => {
      notify('vcal.move.moved');
      setOpenItem(null);
      void refresh();
    },
    onError: (err) => {
      const reason = moveBlockReasonOf(err);
      notifyError(reason ? MOVE_BLOCKED_KEY[reason] : 'vcal.move.error');
    },
  });

  const edit = useMutation({
    mutationFn: ({ item, patch }: { item: CalendarWindowItem; patch: CalendarEntryPatch }) => updateCalendarEntry(item.event_id, patch, role),
    onSuccess: () => {
      notify('vcal.edit.saved');
      setOpenItem(null);
      void refresh();
    },
    onError: () => notifyError('vcal.edit.error'),
  });

  const remove = useMutation({
    mutationFn: (item: CalendarWindowItem) => cancelCalendarEntry(item.event_id, role),
    onSuccess: () => {
      notify('vcal.remove.removed');
      setOpenItem(null);
      void refresh();
    },
    onError: () => notifyError('vcal.remove.error'),
  });

  const closeEntry = useCallback(() => {
    setOpenItem(null);
    setPendingEntryId(null);
    if (entryId) navigateToWebPath('/calendar', { replace: true });
  }, [entryId]);

  const isTodayAnchor = sameDay(anchor, now);

  // One quiet line under the date: how the day looks.
  const dayEntries = items.filter((i) => i.event && !i.work && !isMilestone(i));
  const nextOnDay = dayEntries.find((i) => !isDone(i.event!) && Date.parse(i.start_time) > now.getTime());
  const todayDone = dayEntries.filter((i) => isDone(i.event!)).length;
  const daySummary =
    dayEntries.length === 0
      ? t('vcal.summary.nothing')
      : [
          dayEntries.length === 1 ? t('vcal.summary.entriesOne') : t('vcal.summary.entries', { count: dayEntries.length }),
          isTodayAnchor && nextOnDay ? t('vcal.summary.next', { time: fmt.hhmm(nextOnDay.start_time) }) : null,
          isTodayAnchor && todayDone > 0 ? t('vcal.summary.done', { count: todayDone }) : null,
        ]
          .filter(Boolean)
          .join(' · ');

  const weekFrom = viewRange('week', anchor).from;
  const weekTo = new Date(weekFrom.getTime() + 6 * 86_400_000);
  const dayTitle = fmt.fmtDate(anchor, { weekday: 'long', day: 'numeric', month: 'long' });
  const dayTitleParts = dayTitle.split(/(\d+|[\u0660-\u0669]+)/);
  const rangeTitle = view === 'week' ? `${fmt.fmtDate(weekFrom, { day: 'numeric', month: 'short' })} – ${fmt.fmtDate(weekTo, { day: 'numeric', month: 'short' })}` : fmt.formatDate(anchor, 'LLLL yyyy');

  let body: ReactElement;
  if (query.isLoading) {
    body = (
      <View style={styles.stack} accessibilityLabel={t('vcal.loading')} testID="vcal-loading">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  } else if (query.isError) {
    body = (
      <View style={[styles.errorBox, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="alert" testID="vcal-error">
        <Text weight="700" style={styles.center}>
          {t('vcal.error')}
        </Text>
        <Button onPress={() => void query.refetch()} testID="vcal-retry">
          {t('vcal.retry')}
        </Button>
      </View>
    );
  } else if (view === 'day') {
    body = <DayView key={anchor.toDateString()} items={items} onOpen={setOpenItem} summary={daySummary} />;
  } else if (view === 'week') {
    body = <WeekView key={viewRange('week', anchor).from.toISOString()} anchor={anchor} items={items} now={now} onOpen={setOpenItem} onAdd={setAddFor} />;
  } else {
    body = <MonthView key={`${anchor.getFullYear()}-${anchor.getMonth()}`} anchor={anchor} items={items} now={now} onOpen={setOpenItem} onAdd={setAddFor} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="calendar-screen">
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]} testID="vcal-header">
          <Text variant="caption" weight="700" style={styles.eyebrow}>
            {t(`vcal.views.${view}`)}
          </Text>
          <Text variant="title" accessibilityRole="header" style={[styles.center, { color: colors.foreground }]} testID="vcal-date">
            {view === 'day'
              ? dayTitleParts.map((part, i) =>
                  i % 2 === 1 ? (
                    <Text key={i} variant="title" style={styles.dayNumber}>
                      {part}
                    </Text>
                  ) : (
                    part
                  ),
                )
              : rangeTitle}
          </Text>
          <View style={styles.nav}>
            <Pressable onPress={() => setAnchor((a) => stepAnchor(view, a, -1))} accessibilityRole="button" accessibilityLabel={t('vcal.prev')} testID="vcal-prev" style={[styles.navBtn, { backgroundColor: SURFACE.track }]}>
              <Text weight="700">{'‹'}</Text>
            </Pressable>
            {!isTodayAnchor ? (
              <Pressable onPress={() => setAnchor(new Date())} accessibilityRole="button" testID="vcal-today" style={[styles.navBtn, styles.todayBtn, { backgroundColor: SURFACE.track }]}>
                <Text weight="600">{t('vcal.today')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setAnchor((a) => stepAnchor(view, a, 1))} accessibilityRole="button" accessibilityLabel={t('vcal.next')} testID="vcal-next" style={[styles.navBtn, { backgroundColor: SURFACE.track }]}>
              <Text weight="700">{'›'}</Text>
            </Pressable>
          </View>
        </View>

        <ViewSwitch view={view} onChange={changeView} />

        {entryMissing ? (
          <View style={[styles.note, { backgroundColor: SURFACE.track }]} accessibilityRole="alert" testID="vcal-entry-not-found">
            <Text>{t('calendarNative.entry.notFound')}</Text>
          </View>
        ) : null}

        {body}

        <Pressable onPress={() => navigateToWebPath('/reminders')} accessibilityRole="link" testID="vcal-reminders-link" style={[styles.remindersLink, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text>🔔</Text>
          <Text weight="600" style={styles.flex}>
            {t('vcal.remindersSection.title')}
          </Text>
          <Text muted>{'›'}</Text>
        </Pressable>
      </ScrollView>

      <Pressable onPress={() => setAddFor(anchor)} accessibilityRole="button" accessibilityLabel={t('vcal.add.title')} testID="vcal-add" style={[styles.fab, { backgroundColor: SURFACE.ink }]}>
        <Text style={styles.fabPlus}>{'+'}</Text>
      </Pressable>

      {openItem?.event ? (
        <EntryScreen
          item={openItem}
          now={now}
          role={role}
          onClose={closeEntry}
          onComplete={(i) => complete.mutate(i)}
          completing={complete.isPending}
          onMove={(i, start) => move.mutate({ item: i, start })}
          moving={move.isPending}
          onEdit={(i, patch) => edit.mutate({ item: i, patch })}
          saving={edit.isPending}
          onRemove={(i) => remove.mutate(i)}
          removing={remove.isPending}
          onOpenSource={(path) => navigateToWebPath(path)}
        />
      ) : null}
      {addFor ? <AddEntrySheet day={addFor} role={role} onClose={() => setAddFor(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 16, gap: 16, paddingBottom: 120 },
  stack: { gap: 8 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { borderWidth: 1, borderRadius: 28, paddingHorizontal: 16, paddingVertical: 20, gap: 8, alignItems: 'center' },
  eyebrow: { color: SURFACE.muted, textTransform: 'uppercase' },
  dayNumber: { color: '#DB2777' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  navBtn: { minWidth: 44, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  todayBtn: { paddingHorizontal: 20 },
  skeleton: { height: 64, borderRadius: 16 },
  errorBox: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 12, alignItems: 'center' },
  note: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  remindersLink: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, minHeight: 56 },
  fab: { position: 'absolute', end: 16, bottom: 24, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabPlus: { color: '#FFFFFF', fontSize: 28, lineHeight: 32 },
});
