/**
 * VTID-05530 — one calendar entry opened full-screen (twin of the web's `vcal/EntryScreen.tsx`):
 * big emoji, when / where, the countdown, what it is about, the reminders it will really get, and
 * the actions: mark done, move, edit and remove the member's own entries, the way back to the
 * community event or live room, directions and the audiobook player. An event or live room that is
 * over says so and every action on it answers "in the past, not active".
 *
 * Not ported in this lane (listed in the PR body): share to the news feed, invite to a chat, and
 * "Ask Vitana" (the ORB guide opens from the shell's orb button).
 *
 * The screen is a full-screen modal; the system back gesture (Android back, the iOS sheet dismiss)
 * and the close button both call `onClose`.
 */
import { useState, type ReactElement } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, notify, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import type { CalendarEntryPatch, CalendarWindowItem } from './data/api';
import { KIND_STYLE, SURFACE, entryKind, isDone } from './theme';
import { entryTitle, itemEmoji, sourceLabel } from './labels';
import { AUDIOBOOK_PATH, canEditEntry, canRemoveEntry, isAudiobookEntry, isEndedSourceEntry, sourceActionOf } from './entry-actions';
import { DateTimeField } from './controls';
import { OverlapWarning, useOverlap } from './OverlapWarning';
import { reminderLabel, relativeIn } from './time';

interface Props {
  item: CalendarWindowItem;
  now: Date;
  onClose: () => void;
  onComplete?: (item: CalendarWindowItem) => void;
  completing?: boolean;
  onMove?: (item: CalendarWindowItem, start: Date) => void;
  moving?: boolean;
  onEdit?: (item: CalendarWindowItem, patch: CalendarEntryPatch) => void;
  saving?: boolean;
  onRemove?: (item: CalendarWindowItem) => void;
  removing?: boolean;
  /** Go to the event, live room, audiobook player … the entry belongs to. */
  onOpenSource?: (path: string) => void;
  role?: string | null;
}

export function EntryScreen({ item, now, onClose, onComplete, completing, onMove, moving, onEdit, saving, onRemove, removing, onOpenSource, role = null }: Props): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const e = item.event!;
  const style = KIND_STYLE[entryKind(e)];
  const done = isDone(e);
  const future = Date.parse(item.start_time) > now.getTime();
  const source = sourceLabel(item, t);
  const ended = isEndedSourceEntry(item, now);
  // Every action on a finished event or room answers the same thing and does nothing else.
  const blockEnded = () => notify('vcal.entry.endedToast');
  // A recurring entry is one row with many occurrences; completing it would complete the whole
  // series, so only one-off entries get the button. Work-lens items are finished where they live;
  // the audiobook entry is informational (the player tracks listening).
  const audiobook = isAudiobookEntry(item);
  const canComplete = !done && item.occurrence_index === null && !item.work && !audiobook && !!onComplete;
  // The gateway decides (`movable`): own one-off entries only, never a booking, lab order or series.
  const canMove = item.movable === true && !done && !item.work && !!onMove;
  const canEdit = canEditEntry(item) && !!onEdit;
  const canRemove = canRemoveEntry(item) && !!onRemove;
  const sourceAction = onOpenSource ? sourceActionOf(item, now) : null;

  const [picking, setPicking] = useState(false);
  const [when, setWhen] = useState(() => new Date(item.start_time));
  const pickedValid = !Number.isNaN(when.getTime()) && when.getTime() !== Date.parse(item.start_time);
  const spanMs = item.end_time ? Date.parse(item.end_time) - Date.parse(item.start_time) : 0;
  const moveOverlap = useOverlap(picking && pickedValid ? when : null, picking && pickedValid ? new Date(when.getTime() + (spanMs > 0 ? spanMs : 0)) : null, role, item.event_id);

  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: e.title,
    start: new Date(item.start_time),
    end: item.end_time ? new Date(item.end_time) : (null as Date | null),
    location: e.location ?? '',
    description: e.description ?? '',
  }));
  const draftValid = draft.title.trim().length > 0 && !Number.isNaN(draft.start.getTime()) && (!draft.end || draft.end.getTime() > draft.start.getTime());
  const editOverlap = useOverlap(editing && draftValid ? draft.start : null, editing && draftValid ? draft.end : null, role, item.event_id);

  const saveEdit = () => {
    if (!draftValid) return;
    onEdit!(item, {
      title: draft.title.trim(),
      start_time: draft.start.toISOString(),
      end_time: draft.end ? draft.end.toISOString() : null,
      location: draft.location.trim() || null,
      description: draft.description.trim() || null,
    });
  };

  const openDirections = () => {
    if (!e.location) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.location)}`);
  };

  const secondary = [styles.secondary, { backgroundColor: SURFACE.track }];
  const primary = [styles.primary, { backgroundColor: style.accent }];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} testID="vcal-entry-screen">
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
        <View style={[styles.header, { backgroundColor: style.accent }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('vcal.entry.close')} testID="vcal-entry-close" hitSlop={8} style={styles.closeBtn}>
              <Text style={styles.onAccent} size="lg">
                ✕
              </Text>
            </Pressable>
            {source ? (
              <View style={styles.pill}>
                <Text size="xs" style={styles.onAccent} numberOfLines={1}>
                  {source}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 64, lineHeight: 76 }} importantForAccessibility="no-hide-descendants">
            {itemEmoji(item)}
          </Text>
          <Text variant="title" accessibilityRole="header" style={styles.onAccent}>
            {entryTitle(e, t)}
          </Text>
          <View style={styles.headerFacts}>
            <Text style={styles.onAccent}>{`📅 ${fmt.fmtDate(item.start_time, { weekday: 'long', day: 'numeric', month: 'long' })}`}</Text>
            <Text style={styles.onAccent}>{`🕗 ${fmt.timeRange(item.start_time, item.end_time)}${e.location ? ` · ${e.location}` : ''}`}</Text>
            {e.rrule ? <Text style={styles.onAccent}>{`🔁 ${t('vcal.recurring')}`}</Text> : null}
          </View>
          {done ? (
            <View style={styles.statusChip}>
              <Text style={{ color: style.ink }}>{`✅ ${t('vcal.done')}`}</Text>
            </View>
          ) : ended ? (
            <View style={styles.statusChip} testID="vcal-ended-chip">
              <Text style={{ color: style.ink }}>{`⌛ ${t('vcal.entry.endedChip')}`}</Text>
            </View>
          ) : future ? (
            <View style={styles.statusChip}>
              <Text style={{ color: style.ink }}>{`⏳ ${relativeIn(item.start_time, now, t)}`}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          {item.work ? (
            <View style={[styles.note, { backgroundColor: style.bg }]} testID="vcal-work-note">
              <Text size="sm" style={{ color: style.ink }}>
                {t('vcal.work.readOnly')}
              </Text>
            </View>
          ) : null}

          {e.description ? (
            <View style={styles.section}>
              <Text variant="caption" muted>
                {t('vcal.entry.about')}
              </Text>
              <Text>{e.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text variant="caption" muted>
              {t('vcal.entry.reminders')}
            </Text>
            <View style={styles.chips} testID="vcal-reminders">
              {item.reminders?.length ? (
                item.reminders.map((r, i) => (
                  <View key={i} style={[styles.reminderChip, { backgroundColor: style.bg }]}>
                    <Text size="sm" style={{ color: style.ink }}>{`🔔 ${reminderLabel(r, t, fmt)}`}</Text>
                  </View>
                ))
              ) : (
                <Text size="sm" muted>
                  {t('vcal.entry.noReminders')}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {ended ? (
            <View style={[styles.note, { backgroundColor: style.bg }]} accessibilityRole="alert" testID="vcal-ended-notice">
              <Text size="sm" style={{ color: style.ink }}>
                {t('vcal.entry.endedNotice')}
              </Text>
            </View>
          ) : null}

          {canComplete ? (
            <Pressable
              onPress={() => (ended ? blockEnded() : onComplete!(item))}
              disabled={completing}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!completing }}
              testID="vcal-complete"
              style={[...primary, { opacity: completing ? 0.6 : ended ? 0.5 : 1 }]}
            >
              <Text weight="700" size="lg" style={styles.onAccent}>{`✅ ${t('vcal.markDone')}`}</Text>
            </Pressable>
          ) : null}

          {audiobook && onOpenSource ? (
            <Pressable onPress={() => onOpenSource(AUDIOBOOK_PATH)} accessibilityRole="button" testID="vcal-listen" style={primary}>
              <Text weight="700" size="lg" style={styles.onAccent}>{`🎧 ${t('vcal.audiobook.listen')}`}</Text>
            </Pressable>
          ) : null}

          {canMove && picking ? (
            <View style={[styles.panel, { backgroundColor: style.bg }]} testID="vcal-move-picker">
              <Text variant="caption" style={{ color: style.ink }}>
                {t('vcal.move.title')}
              </Text>
              <DateTimeField value={when} onChange={setWhen} testID="vcal-move" />
              <Text size="sm" style={{ color: style.ink }}>
                {t('vcal.move.keepsLength')}
              </Text>
              <OverlapWarning conflicts={moveOverlap} />
              <View style={styles.pair}>
                <Pressable onPress={() => setPicking(false)} accessibilityRole="button" testID="vcal-move-cancel" style={[...secondary, styles.flex]}>
                  <Text>{t('vcal.move.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => pickedValid && !moving && onMove!(item, when)}
                  disabled={!pickedValid || moving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !pickedValid || !!moving }}
                  testID="vcal-move-confirm"
                  style={[styles.secondary, styles.flex, { backgroundColor: style.accent, opacity: !pickedValid || moving ? 0.6 : 1 }]}
                >
                  <Text weight="700" style={styles.onAccent}>
                    {t('vcal.move.confirm')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {canMove && !picking ? (
            <Pressable onPress={() => (ended ? blockEnded() : setPicking(true))} accessibilityRole="button" testID="vcal-move" style={[...secondary, { opacity: ended ? 0.5 : 1 }]}>
              <Text>{`🗓 ${t('vcal.move.action')}`}</Text>
            </Pressable>
          ) : null}

          {sourceAction ? (
            <Pressable
              onPress={() => (ended ? blockEnded() : onOpenSource!(sourceAction.path))}
              accessibilityRole="button"
              testID="vcal-open-source"
              style={sourceAction.kind === 'live_room' && sourceAction.joinable ? primary : [...secondary, { opacity: ended ? 0.5 : 1 }]}
            >
              <Text weight={sourceAction.kind === 'live_room' && sourceAction.joinable ? '700' : '400'} style={sourceAction.kind === 'live_room' && sourceAction.joinable ? styles.onAccent : undefined}>
                {sourceAction.kind === 'event' ? `🎟 ${t('vcal.entry.openEvent')}` : sourceAction.joinable ? `🎥 ${t('vcal.entry.joinRoom')}` : `🎥 ${t('vcal.entry.openRoom')}`}
              </Text>
            </Pressable>
          ) : null}

          {canEdit && editing ? (
            <View style={[styles.panel, { backgroundColor: style.bg }]} testID="vcal-edit-form">
              <Text variant="caption" style={{ color: style.ink }}>
                {t('vcal.edit.titleLabel')}
              </Text>
              <TextInput
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                accessibilityLabel={t('vcal.edit.titleLabel')}
                testID="vcal-edit-title"
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              />
              <DateTimeField label={t('vcal.edit.startLabel')} value={draft.start} onChange={(v) => setDraft((d) => ({ ...d, start: v }))} testID="vcal-edit-start" />
              {draft.end ? (
                <DateTimeField label={t('vcal.edit.endLabel')} value={draft.end} onChange={(v) => setDraft((d) => ({ ...d, end: v }))} testID="vcal-edit-end" />
              ) : null}
              <Text variant="caption" style={{ color: style.ink }}>
                {t('vcal.edit.locationLabel')}
              </Text>
              <TextInput
                value={draft.location}
                onChangeText={(v) => setDraft((d) => ({ ...d, location: v }))}
                accessibilityLabel={t('vcal.edit.locationLabel')}
                testID="vcal-edit-location"
                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
              />
              <Text variant="caption" style={{ color: style.ink }}>
                {t('vcal.edit.descriptionLabel')}
              </Text>
              <TextInput
                value={draft.description}
                onChangeText={(v) => setDraft((d) => ({ ...d, description: v }))}
                accessibilityLabel={t('vcal.edit.descriptionLabel')}
                multiline
                numberOfLines={3}
                testID="vcal-edit-description"
                style={[styles.input, styles.multiline, { backgroundColor: colors.card, color: colors.foreground }]}
              />
              <OverlapWarning conflicts={editOverlap} />
              {!draftValid ? (
                <Text size="sm" accessibilityRole="alert" style={{ color: style.ink }}>
                  {t('vcal.edit.invalid')}
                </Text>
              ) : null}
              <View style={styles.pair}>
                <Pressable onPress={() => setEditing(false)} accessibilityRole="button" testID="vcal-edit-cancel" style={[...secondary, styles.flex]}>
                  <Text>{t('vcal.edit.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={saveEdit}
                  disabled={!draftValid || saving}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !draftValid || !!saving }}
                  testID="vcal-edit-save"
                  style={[styles.secondary, styles.flex, { backgroundColor: style.accent, opacity: !draftValid || saving ? 0.6 : 1 }]}
                >
                  <Text weight="700" style={styles.onAccent}>
                    {t('vcal.edit.save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {(canEdit || canRemove) && !editing && !confirmRemove ? (
            <View style={styles.pair}>
              {canEdit ? (
                <Pressable onPress={() => setEditing(true)} accessibilityRole="button" testID="vcal-edit" style={[...secondary, styles.flex]}>
                  <Text>{`✏ ${t('vcal.edit.action')}`}</Text>
                </Pressable>
              ) : null}
              {canRemove ? (
                <Pressable onPress={() => setConfirmRemove(true)} accessibilityRole="button" testID="vcal-remove" style={[...secondary, styles.flex]}>
                  <Text>{`🗑 ${t('vcal.remove.action')}`}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {canRemove && confirmRemove ? (
            <View style={[styles.panel, { backgroundColor: style.bg }]} testID="vcal-remove-confirm">
              <Text size="sm" style={{ color: style.ink }}>
                {e.rrule ? t('vcal.remove.confirmSeries') : t('vcal.remove.confirm')}
              </Text>
              <View style={styles.pair}>
                <Pressable onPress={() => setConfirmRemove(false)} accessibilityRole="button" testID="vcal-remove-keep" style={[...secondary, styles.flex]}>
                  <Text>{t('vcal.remove.keep')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onRemove!(item)}
                  disabled={removing}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!removing }}
                  testID="vcal-remove-yes"
                  style={[styles.secondary, styles.flex, { backgroundColor: style.accent, opacity: removing ? 0.6 : 1 }]}
                >
                  <Text weight="700" style={styles.onAccent}>
                    {t('vcal.remove.yes')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {e.location ? (
            <Pressable onPress={openDirections} accessibilityRole="button" testID="vcal-directions" style={secondary}>
              <Text>{`🗺 ${t('vcal.entry.directions')}`}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 48 },
  flex: { flex: 1 },
  header: { gap: 14, paddingHorizontal: 22, paddingTop: 52, paddingBottom: 28, borderBottomStartRadius: 36, borderBottomEndRadius: 36 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', flexShrink: 1 },
  onAccent: { color: '#FFFFFF' },
  headerFacts: { gap: 4 },
  statusChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  body: { paddingHorizontal: 22, paddingTop: 20, gap: 20 },
  section: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  note: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  footer: { paddingHorizontal: 22, paddingTop: 20, gap: 10 },
  primary: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  panel: { borderRadius: 18, padding: 16, gap: 10 },
  pair: { flexDirection: 'row', gap: 10 },
  input: { minHeight: 48, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
});
