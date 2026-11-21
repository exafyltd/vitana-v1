/**
 * VTID-05530 (native-wave2-events-calendar-r3/calendar-reminders) — native port of the web
 * reminders screen (`src/pages/Reminders.tsx` + `RemindersPanel.tsx`) at `/reminders`, and of the
 * push deep link `/reminders/fire/:fireId` (the same screen with `fireId`: it renders the list and
 * surfaces the interrupt card on top, as the web does).
 *
 * Layered model: 1. Suggested by Vitana (created_via 'system'); 2. Scheduled by you (voice / ui,
 * still pending); 3. Recent (fired / completed / cancelled, last 30). `?filter=upcoming|completed|missed`
 * shows one list. Mark done, delete (confirm), delete all (confirm) and add manually.
 *
 * Not ported: the "enable notifications" prompt (a browser permission; native push is registered by
 * the shell) and the live fire stream (chime and voice).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Skeleton, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import { DateTimeField } from './controls';
import { ReminderFireOverlay } from './ReminderFireOverlay';
import type { ReminderRow } from './data/reminders';
import { useCompleteReminder, useCreateReminder, useDeleteAllReminders, useDeleteReminder, useReminderById, useReminders } from './data/hooks';

export type ReminderFilter = 'upcoming' | 'completed' | 'missed';
const VALID_FILTERS: readonly ReminderFilter[] = ['upcoming', 'completed', 'missed'];

const isUpcoming = (r: ReminderRow) => r.status === 'pending' || r.status === 'dispatching';
const newestFirst = (a: ReminderRow, b: ReminderRow) => b.next_fire_at.localeCompare(a.next_fire_at);

function RemindersGroup({ title, testID, children, icon }: { title: string; testID: string; children: ReactElement | ReactElement[] | null; icon?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]} testID={testID}>
      <View style={styles.groupHead}>
        {icon ? <Text importantForAccessibility="no-hide-descendants">{icon}</Text> : null}
        <Text weight="700" size="lg" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ReminderRowItem({ reminder, onDelete, onComplete }: { reminder: ReminderRow; onDelete: (r: ReminderRow) => void; onComplete: (r: ReminderRow) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const isSystem = reminder.created_via === 'system';
  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]} testID={`reminder-${reminder.id}`}>
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <Text weight="600" numberOfLines={1} style={styles.flex}>
            {reminder.action_text}
          </Text>
          {isSystem ? (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text size="xs" importantForAccessibility="no-hide-descendants">
                ✨
              </Text>
              <Text size="xs" weight="600" style={{ color: colors.primary }}>
                {t('screens.reminders.vitana')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" muted testID={`reminder-time-${reminder.id}`}>
          {fmt.fmtDateTime(reminder.next_fire_at, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </Text>
        {reminder.description ? (
          <Text variant="caption" muted numberOfLines={1}>
            {reminder.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        {isUpcoming(reminder) ? (
          <Pressable onPress={() => onComplete(reminder)} accessibilityRole="button" accessibilityLabel={t('screens.reminders.markDone')} testID={`reminder-done-${reminder.id}`} hitSlop={6} style={styles.iconBtn}>
            <Text weight="700">✓</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => onDelete(reminder)} accessibilityRole="button" accessibilityLabel={t('screens.reminders.delete')} testID={`reminder-delete-${reminder.id}`} hitSlop={6} style={styles.iconBtn}>
          <Text>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
}

function defaultWhen(): Date {
  return new Date(Date.now() + 5 * 60_000);
}

export function RemindersScreen({ fireId, filter: initialFilter }: { fireId?: string; filter?: string }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const list = useReminders();
  const createMut = useCreateReminder();
  const deleteMut = useDeleteReminder();
  const deleteAllMut = useDeleteAllReminders();
  const completeMut = useCompleteReminder();
  const fire = useReminderById(fireId);
  const [fireClosed, setFireClosed] = useState(false);

  const [filter, setFilter] = useState<ReminderFilter | null>(VALID_FILTERS.includes(initialFilter as ReminderFilter) ? (initialFilter as ReminderFilter) : null);
  const [openCreate, setOpenCreate] = useState(false);
  const [actionText, setActionText] = useState('');
  const [spokenMessage, setSpokenMessage] = useState('');
  const [when, setWhen] = useState<Date>(defaultWhen);
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<ReminderRow | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const upcoming = useMemo(() => all.filter(isUpcoming).sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at)), [all]);
  const suggested = useMemo(() => upcoming.filter((r) => r.created_via === 'system'), [upcoming]);
  const scheduledByYou = useMemo(() => upcoming.filter((r) => r.created_via === 'voice' || r.created_via === 'ui'), [upcoming]);
  const recent = useMemo(() => all.filter((r) => r.status === 'fired' || r.status === 'completed' || r.status === 'cancelled').sort(newestFirst).slice(0, 30), [all]);
  const missed = useMemo(() => all.filter((r) => r.status === 'fired').sort(newestFirst), [all]);
  const completed = useMemo(() => all.filter((r) => r.status === 'completed').sort(newestFirst), [all]);

  const filtered: { title: string; items: ReminderRow[]; emptyText: string } | null = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return { title: t('screens.reminders.filterUpcoming'), items: upcoming, emptyText: t('screens.reminders.noUpcoming') };
      case 'completed':
        return { title: t('screens.reminders.filterCompleted'), items: completed, emptyText: t('screens.reminders.noCompleted') };
      case 'missed':
        return { title: t('screens.reminders.filterMissed'), items: missed, emptyText: t('screens.reminders.noMissed') };
      default:
        return null;
    }
  }, [filter, upcoming, completed, missed, t]);

  const handleCreate = async () => {
    const text = actionText.trim();
    if (!text) {
      notifyError('toasts.reminders.pleaseEnterWhatRemindYouAbout');
      return;
    }
    if (Number.isNaN(when.getTime())) {
      notifyError('toasts.reminders.invalidTime');
      return;
    }
    try {
      await createMut.mutateAsync({
        action_text: text,
        // No invented spoken sentence: unset, the client sends the reminder text itself (spoken wording is never hardcoded).
        spoken_message: spokenMessage.trim() || undefined,
        scheduled_for_iso: when.toISOString(),
        description: description.trim() || undefined,
        lang: language.slice(0, 5),
      });
      notify('toasts.reminders.reminderCreated');
      setOpenCreate(false);
      setActionText('');
      setSpokenMessage('');
      setDescription('');
      setWhen(defaultWhen());
    } catch {
      notifyError('toasts.reminders.failedToCreate');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMut.mutateAsync(confirmDelete.id);
      notify('toasts.reminders.reminderDeleted');
    } catch {
      notifyError('toasts.reminders.failedToDelete');
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const r = await deleteAllMut.mutateAsync();
      notify('toasts.reminders.remindersDeleted', undefined, { count: r.deleted });
    } catch {
      notifyError('toasts.reminders.failedToDelete');
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  const handleComplete = async (r: ReminderRow) => {
    try {
      await completeMut.mutateAsync(r.id);
      notify('toasts.reminders.markedDone');
    } catch {
      notifyError('toasts.reminders.failedToMarkDone');
    }
  };

  const rows = (items: ReminderRow[]) => items.map((r) => <ReminderRowItem key={r.id} reminder={r} onDelete={setConfirmDelete} onComplete={(x) => void handleComplete(x)} />);

  let content: ReactElement;
  if (list.isError) {
    content = (
      <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="alert" testID="reminders-error">
        <Text weight="700" style={styles.center}>
          {t('errors.somethingWentWrong')}
        </Text>
        <Button variant="outline" onPress={() => void list.refetch()} testID="reminders-retry">
          {t('common.retry')}
        </Button>
      </View>
    );
  } else if (list.isLoading) {
    content = (
      <View style={styles.stack} testID="reminders-loading" accessibilityLabel={t('screens.reminders.loading')}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={styles.skeleton} />
        ))}
      </View>
    );
  } else if (filtered) {
    content = (
      <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]} testID="reminders-filtered">
        <View style={styles.groupHead}>
          <Text weight="700" size="lg" accessibilityRole="header" style={styles.flex}>
            {filtered.title}
          </Text>
          <Pressable onPress={() => setFilter(null)} accessibilityRole="button" testID="reminders-show-all" hitSlop={8}>
            <Text size="sm" muted style={styles.underline}>
              {t('screens.reminders.showAll')}
            </Text>
          </Pressable>
        </View>
        {filtered.items.length === 0 ? (
          <Text muted style={styles.center}>
            {filtered.emptyText}
          </Text>
        ) : (
          rows(filtered.items)
        )}
      </View>
    );
  } else {
    content = (
      <View style={styles.stack}>
        <RemindersGroup title={t('screens.reminders.suggestedByVitana')} testID="reminders-group-suggested" icon="✨">
          {suggested.length === 0 ? (
            <Text muted style={styles.center}>
              {t('screens.reminders.vitanaHasnTSuggestedAnyReminders')}
            </Text>
          ) : (
            <View style={styles.stack}>{rows(suggested)}</View>
          )}
        </RemindersGroup>
        <RemindersGroup title={t('screens.reminders.scheduledByYou')} testID="reminders-group-scheduled">
          {scheduledByYou.length === 0 ? (
            <Text muted style={styles.center}>
              {t('screens.reminders.tapOrbSay')} <Text muted style={styles.italic}>{t('screens.reminders.remindMeAt8pmTakeMy')}</Text>
            </Text>
          ) : (
            <View style={styles.stack}>{rows(scheduledByYou)}</View>
          )}
        </RemindersGroup>
        {recent.length > 0 ? (
          <RemindersGroup title={t('screens.reminders.recent')} testID="reminders-group-recent">
            <View style={styles.stack}>{rows(recent)}</View>
          </RemindersGroup>
        ) : null}
      </View>
    );
  }

  const showFire = !!fireId && !fireClosed && !!fire.data;
  const fireMissing = !!fireId && fire.isSuccess && !fire.data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="reminders-screen">
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">{`🔔 ${t('screens.reminders.reminders')}`}</Text>
          <Text muted>{t('screens.reminders.subtitleDefault')}</Text>
        </View>

        {fireMissing ? (
          <View style={[styles.note, { backgroundColor: colors.muted }]} accessibilityRole="alert" testID="reminder-fire-missing">
            <Text>{t('calendarNative.reminders.fireNotFound')}</Text>
          </View>
        ) : null}

        {!filtered ? (
          <View style={styles.toolbar}>
            {upcoming.length >= 2 ? (
              <Pressable onPress={() => setConfirmDeleteAll(true)} accessibilityRole="button" testID="reminders-delete-all" style={styles.flex}>
                <Text size="sm" muted style={styles.underline}>
                  {t('screens.reminders.deleteAllLengthReminders', { length: upcoming.length })}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.flex} />
            )}
            <Button variant="ghost" size="sm" onPress={() => setOpenCreate(true)} testID="reminders-add">
              {`＋ ${t('screens.reminders.addManually')}`}
            </Button>
          </View>
        ) : null}

        {confirmDeleteAll ? (
          <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="alert" testID="reminders-delete-all-confirm">
            <Text weight="700">{t('screens.reminders.deleteAllLengthReminders', { length: upcoming.length })}</Text>
            <Text muted>{t('screens.reminders.theyWillRemovedFromYourList')}</Text>
            <View style={styles.pair}>
              <Button variant="outline" onPress={() => setConfirmDeleteAll(false)} testID="reminders-delete-all-no" style={styles.flex}>
                {t('screens.reminders.cancel')}
              </Button>
              <Button variant="destructive" onPress={() => void handleDeleteAll()} disabled={deleteAllMut.isPending} testID="reminders-delete-all-yes" style={styles.flex}>
                {t('screens.reminders.deleteAll')}
              </Button>
            </View>
          </View>
        ) : null}

        {confirmDelete ? (
          <View style={[styles.group, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="alert" testID="reminder-delete-confirm">
            <Text weight="700">{t('screens.reminders.deleteThisReminder')}</Text>
            <Text muted>{confirmDelete.action_text}</Text>
            <View style={styles.pair}>
              <Button variant="outline" onPress={() => setConfirmDelete(null)} testID="reminder-delete-no" style={styles.flex}>
                {t('screens.reminders.cancel')}
              </Button>
              <Button variant="destructive" onPress={() => void handleDelete()} disabled={deleteMut.isPending} testID="reminder-delete-yes" style={styles.flex}>
                {t('screens.reminders.delete')}
              </Button>
            </View>
          </View>
        ) : null}

        {content}
      </ScrollView>

      {openCreate ? (
        <BottomSheet open onClose={() => setOpenCreate(false)} title={t('screens.reminders.newReminder')} testID="reminder-form">
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text muted>{t('screens.reminders.vitanaWillChimeSpeakAtScheduled')}</Text>
            <View style={styles.field}>
              <Text variant="caption" muted>
                {t('screens.reminders.whatRemindYouAbout')}
              </Text>
              <TextInput
                value={actionText}
                onChangeText={setActionText}
                placeholder={t('screens.reminders.takeMagnesium')}
                accessibilityLabel={t('screens.reminders.whatRemindYouAbout')}
                testID="reminder-form-action"
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <DateTimeField label={t('screens.reminders.when')} value={when} onChange={setWhen} testID="reminder-form-when" />
            <View style={styles.field}>
              <Text variant="caption" muted>
                {t('screens.reminders.spokenMessageOptional')}
              </Text>
              <TextInput
                value={spokenMessage}
                onChangeText={setSpokenMessage}
                placeholder={t('screens.reminders.timeTakeYourMagnesiumPills')}
                accessibilityLabel={t('screens.reminders.spokenMessageOptional')}
                testID="reminder-form-spoken"
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <View style={styles.field}>
              <Text variant="caption" muted>
                {t('screens.reminders.notesOptional')}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                accessibilityLabel={t('screens.reminders.notesOptional')}
                testID="reminder-form-notes"
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              />
            </View>
            <View style={styles.pair}>
              <Button variant="ghost" onPress={() => setOpenCreate(false)} testID="reminder-form-cancel" style={styles.flex}>
                {t('screens.reminders.cancel')}
              </Button>
              <Button onPress={() => void handleCreate()} disabled={createMut.isPending} testID="reminder-form-submit" style={styles.flex}>
                {createMut.isPending ? t('screens.reminders.creating') : t('screens.reminders.createReminder')}
              </Button>
            </View>
          </ScrollView>
        </BottomSheet>
      ) : null}

      {showFire && fire.data ? <ReminderFireOverlay reminder={fire.data} onClose={() => setFireClosed(true)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { padding: 16, gap: 16, paddingBottom: 48 },
  header: { gap: 4 },
  stack: { gap: 8 },
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center', paddingVertical: 12 },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  group: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  skeleton: { height: 64, borderRadius: 14 },
  note: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  pair: { flexDirection: 'row', gap: 8 },
  form: { gap: 14, paddingBottom: 24 },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
});
