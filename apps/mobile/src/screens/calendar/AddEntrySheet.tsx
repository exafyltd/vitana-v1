/**
 * VTID-05530 — the calendar's "+" (twin of the web's `vcal/AddEntrySheet.tsx` and
 * `MobileEventForm.tsx`): add an entry by hand. Title, a day (Today / Tomorrow / day stepper),
 * start and end in 15-minute steps, "Find a time", the overlap warning, an optional place and the
 * category. Saving goes through the gateway so the default reminders apply and the new entry shows
 * up in every view straight away.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet, Button, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useFormat } from './useFormat';
import { Chip, Stepper, TIME_STEP_MIN } from './controls';
import { FindTime } from './FindTime';
import { OverlapWarning, useOverlap } from './OverlapWarning';
import { createCalendarEntry } from './data/api';
import { addDays, atTime, roundToNext15, sameDay } from './time';

const EVENT_TYPES = ['personal', 'professional', 'health', 'workout', 'community', 'nutrition'] as const;
type EventType = (typeof EVENT_TYPES)[number];

const DAY_MIN = 24 * 60;
const wrap = (minutes: number) => ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN;
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

export function AddEntrySheet({ day, role, onClose }: { day: Date; role: string | null; onClose: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const now = new Date();
  const defaultStart = minutesOf(roundToNext15(now)) % DAY_MIN;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(day);
  const [startMin, setStartMin] = useState(defaultStart);
  const [endMin, setEndMin] = useState(wrap(defaultStart + 60));
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState<EventType>('personal');

  const slot = (minutes: number) => atTime(date, Math.floor(minutes / 60), minutes % 60);
  // An end before the start (a wrapped 00:xx end after a 23:xx start) is not a length: ask for an hour.
  const spanMin = Math.round((slot(endMin).getTime() - slot(startMin).getTime()) / 60000);
  const askedDuration = spanMin > 0 ? Math.max(15, spanMin) : 60;
  const overlap = useOverlap(slot(startMin), slot(endMin), role);

  const create = useMutation({
    mutationFn: () => {
      const start = slot(startMin);
      const end = slot(endMin);
      return createCalendarEntry(
        {
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.getTime() > start.getTime() ? end.toISOString() : null,
          location: location.trim() || null,
          event_type: eventType,
        },
        role,
      );
    },
    onSuccess: () => {
      notify('vcal.add.created');
      void queryClient.invalidateQueries({ queryKey: ['calendar-window'] });
      onClose();
    },
    onError: () => notifyError('vcal.add.error'),
  });

  const submit = () => {
    if (!title.trim() || create.isPending) return;
    create.mutate();
  };

  const tomorrow = addDays(now, 1);
  const isToday = sameDay(date, now);
  const isTomorrow = sameDay(date, tomorrow);
  const clock = (minutes: number) => fmt.hhmm(slot(minutes));

  return (
    <BottomSheet open onClose={onClose} title={t('vcal.add.title')} testID="vcal-add-sheet">
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text variant="caption" muted>
            {t('vcal.form.title')}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('vcal.form.titlePlaceholder')}
            accessibilityLabel={t('vcal.form.title')}
            testID="vcal-form-title"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
        </View>

        <View style={styles.field}>
          <Text variant="caption" muted>
            {t('vcal.form.date')}
          </Text>
          <View style={styles.chips}>
            <Chip label={t('vcal.form.today')} selected={isToday} onPress={() => setDate(new Date(now))} testID="vcal-form-today" />
            <Chip label={t('vcal.form.tomorrow')} selected={isTomorrow} onPress={() => setDate(new Date(tomorrow))} testID="vcal-form-tomorrow" />
          </View>
          <Stepper
            value={fmt.fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}
            onPrev={() => setDate((d) => addDays(d, -1))}
            onNext={() => setDate((d) => addDays(d, 1))}
            testID="vcal-form-day"
          />
        </View>

        <View style={styles.times}>
          <View style={styles.flex}>
            <Stepper
              label={t('vcal.form.start')}
              value={clock(startMin)}
              onPrev={() => {
                const next = wrap(startMin - TIME_STEP_MIN);
                setStartMin(next);
                setEndMin(wrap(next + 60));
              }}
              onNext={() => {
                const next = wrap(startMin + TIME_STEP_MIN);
                setStartMin(next);
                setEndMin(wrap(next + 60));
              }}
              testID="vcal-form-start"
            />
          </View>
          <View style={styles.flex}>
            <Stepper
              label={t('vcal.form.end')}
              value={clock(endMin)}
              onPrev={() => setEndMin(wrap(endMin - TIME_STEP_MIN))}
              onNext={() => setEndMin(wrap(endMin + TIME_STEP_MIN))}
              testID="vcal-form-end"
            />
          </View>
        </View>

        <FindTime
          durationMin={askedDuration}
          role={role}
          onPick={(start, end) => {
            setDate(start);
            setStartMin(minutesOf(start));
            setEndMin(minutesOf(end));
          }}
        />
        <OverlapWarning conflicts={overlap} />

        <View style={styles.field}>
          <Text variant="caption" muted>
            {`${t('vcal.form.location')} (${t('vcal.form.optional')})`}
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder={t('vcal.form.locationPlaceholder')}
            accessibilityLabel={t('vcal.form.location')}
            testID="vcal-form-location"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          />
        </View>

        <View style={styles.field}>
          <Text variant="caption" muted>
            {t('vcal.form.category')}
          </Text>
          <View style={styles.chips}>
            {EVENT_TYPES.map((type) => (
              <Chip key={type} label={t(`vcal.form.types.${type}`)} selected={eventType === type} onPress={() => setEventType(type)} testID={`vcal-type-${type}`} />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Button variant="outline" onPress={onClose} testID="vcal-form-cancel" style={styles.flex}>
            {t('vcal.form.cancel')}
          </Button>
          <Button onPress={submit} disabled={!title.trim() || create.isPending} testID="vcal-form-create" style={styles.flex}>
            {t('vcal.form.create')}
          </Button>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 24 },
  field: { gap: 6 },
  flex: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  times: { flexDirection: 'row', gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
});
