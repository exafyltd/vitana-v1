/**
 * VTID-05531 — create and edit form for an event or a meetup (web
 * `CreateEventPopup` / `CreateMeetupPopup` / `EditMeetupPopup`, mobile branch).
 * Fields: title, description, date, start and end time, place (or an online link),
 * capacity. Validation runs before any write; the write goes through the events
 * data layer (insert for create, update by id for edit). Ticket sales and generated
 * cover images are web-only features of the popups and are not part of this port.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/events';
import { buildEventInput, calendarDaysBetween, validateEventForm, type CommunityEvent, type EventForm, type EventFormField } from './data/events';
import { useEventMutations } from './data/hooks';
import { useEventsText } from './text';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function initialEventForm(kind: 'event' | 'meetup', event?: CommunityEvent): EventForm {
  if (!event) {
    return { kind, title: '', description: '', date: '', startTime: '', endTime: '', location: '', isVirtual: false, virtualLink: '', capacity: '' };
  }
  const start = new Date(event.start_time);
  return {
    kind: event.event_type === 'meetup' ? 'meetup' : 'event',
    title: event.title,
    description: event.description ?? '',
    date: toDateInput(start),
    startTime: toTimeInput(start),
    endTime: event.end_time ? toTimeInput(new Date(event.end_time)) : '',
    endDayOffset: event.end_time ? calendarDaysBetween(event.start_time, event.end_time) : 0,
    location: event.location ?? '',
    isVirtual: !!event.virtual_link,
    virtualLink: event.virtual_link ?? '',
    capacity: event.max_participants ? String(event.max_participants) : '',
  };
}

const FIELD_ERROR_KEY: Record<EventFormField, string> = {
  title: 'eventsNative.requiredField',
  date: 'eventsNative.requiredField',
  startTime: 'eventsNative.requiredField',
  endTime: 'eventsNative.requiredField',
  location: 'eventsNative.requiredField',
};

export function EventFormSheet({
  mode,
  kind,
  event,
  open,
  onClose,
}: {
  mode: 'create' | 'edit';
  kind: 'event' | 'meetup';
  event?: CommunityEvent;
  open: boolean;
  onClose: () => void;
}) {
  const text = useEventsText();
  const { colors } = useUITheme();
  const { create, update } = useEventMutations();
  const [form, setForm] = useState<EventForm>(() => initialEventForm(kind, event));
  const [error, setError] = useState<EventFormField | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof EventForm>(key: K) => (value: EventForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isMeetup = form.kind === 'meetup';
  const titleKey = mode === 'edit' ? 'buttons.edit' : isMeetup ? 'screens.common.createNewMeetup' : 'createEventPopup.title';
  const submitKey = mode === 'edit' ? 'buttons.save' : 'buttons.create';

  const submit = async () => {
    const field = validateEventForm(form, new Date());
    setError(field);
    if (field) return;
    setBusy(true);
    const input = buildEventInput(form);
    try {
      if (mode === 'edit' && event) {
        await update.mutateAsync({ id: event.id, input });
        notify(isMeetup ? 'toasts.hooks.meetupUpdated' : 'eventsNative.eventUpdated');
      } else {
        await create.mutateAsync(input);
        notify(isMeetup ? 'toasts.hooks.meetupCreated' : 'createEventPopup.toasts.communityEventCreated');
      }
      onClose();
    } catch {
      notifyError(isMeetup ? 'toasts.hooks.failedCreateMeetupPleaseTryAgain' : 'eventsNative.eventCreateFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} testID="event-form">
      <View style={styles.body}>
        <Text variant="title">{text.t(titleKey)}</Text>
        <TextInput
          testID="event-form-title"
          value={form.title}
          onChangeText={set('title')}
          placeholder={text.t(isMeetup ? 'screens.common.meetupTitle' : 'createEventPopup.eventTitle')}
          accessibilityLabel={text.t(isMeetup ? 'screens.common.meetupTitle' : 'createEventPopup.eventTitle')}
        />
        <TextInput
          testID="event-form-description"
          value={form.description}
          onChangeText={set('description')}
          multiline
          placeholder={text.t('screens.common.description')}
          accessibilityLabel={text.t('screens.common.description')}
        />
        <TextInput
          testID="event-form-date"
          value={form.date}
          onChangeText={set('date')}
          placeholder={text.t('screens.settings.yyyymmdd')}
          accessibilityLabel={text.t('screens.common.date')}
        />
        <TextInput
          testID="event-form-start"
          value={form.startTime}
          onChangeText={set('startTime')}
          placeholder={text.t('screens.common.hhMm')}
          accessibilityLabel={text.t('screens.common.time')}
        />
        <TextInput
          testID="event-form-end"
          value={form.endTime}
          onChangeText={set('endTime')}
          placeholder={text.t('screens.common.hhMm')}
          accessibilityLabel={text.t('createEventPopup.endTime')}
        />
        {form.isVirtual ? (
          <TextInput
            testID="event-form-link"
            value={form.virtualLink}
            onChangeText={set('virtualLink')}
            autoCapitalize="none"
            keyboardType="url"
            placeholder={text.t('screens.events.virtualLinkPlaceholder')}
            accessibilityLabel={text.t('screens.events.virtualLinkLabel')}
          />
        ) : (
          <TextInput
            testID="event-form-location"
            value={form.location}
            onChangeText={set('location')}
            placeholder={text.t('screens.common.location')}
            accessibilityLabel={text.t('screens.common.location')}
          />
        )}
        <Button
          testID="event-form-virtual"
          variant="ghost"
          size="sm"
          onPress={() => set('isVirtual')(!form.isVirtual)}
        >
          {text.t(isMeetup ? 'screens.common.thisMeetupWillHeldOnline' : 'createEventPopup.virtualEvent')}
        </Button>
        <TextInput
          testID="event-form-capacity"
          value={form.capacity}
          onChangeText={set('capacity')}
          keyboardType="number-pad"
          placeholder={text.t('screens.common.leaveEmptyForUnlimited')}
          accessibilityLabel={text.t('screens.common.maxParticipants')}
        />
        {error ? (
          <Text testID="event-form-error" variant="caption" color={colors.destructive}>
            {text.t(FIELD_ERROR_KEY[error])}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button testID="event-form-cancel" variant="outline" onPress={onClose}>
            {text.t('buttons.cancel')}
          </Button>
          <Button testID="event-form-submit" disabled={busy} onPress={() => void submit()}>
            {text.t(submitKey)}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 16 },
  actions: { gap: 8, marginTop: 8 },
});
