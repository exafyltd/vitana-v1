/**
 * VTID-05531 — the event and meetup detail drawer (web `MeetupDetailsDrawer`,
 * mobile branch): title, when and where, host, attendee count, the about text,
 * and the creator's edit and delete actions. Opened from a card; dismissed by
 * the close button or the sheet's own dismiss gesture.
 */
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/events';
import type { CommunityEvent } from './data/events';
import { useEventsText } from './text';

export function EventDrawer({
  event,
  open,
  onClose,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  event: CommunityEvent | null;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (event: CommunityEvent) => void;
  onDelete: (event: CommunityEvent) => void;
}) {
  const text = useEventsText();
  const { colors } = useUITheme();
  return (
    <BottomSheet open={open} onClose={onClose} testID="event-drawer">
      {event ? (
        <View style={styles.body}>
          <Text testID="event-drawer-title" variant="title">
            {event.title}
          </Text>
          <Text variant="label" color={colors.mutedForeground}>
            {text.t('eventDrawer.whenWhere')}
          </Text>
          <Text variant="body">{text.eventTimeLabel(event.start_time)}</Text>
          {event.location ? <Text variant="body">{event.location}</Text> : null}
          {event.virtual_link ? <Text variant="body">{text.t('screens.common.virtualMeetup')}</Text> : null}
          <Text variant="label" color={colors.mutedForeground}>
            {text.t('eventDrawer.host')}
          </Text>
          <Text variant="body">{event.creator_display_name ?? text.t('eventDrawer.communityHost')}</Text>
          <Text variant="body">{text.t('eventDrawer.attendingCount', { current: event.participant_count })}</Text>
          <Text variant="label" color={colors.mutedForeground}>
            {text.t('eventDrawer.about')}
          </Text>
          <Text variant="body">{event.description || text.t('eventDrawer.noDescription')}</Text>
          <View style={styles.actions}>
            {canEdit ? (
              <Button testID="event-drawer-edit" variant="outline" onPress={() => onEdit(event)}>
                {text.t('buttons.edit')}
              </Button>
            ) : null}
            {canDelete ? (
              <Button testID="event-drawer-delete" variant="destructive" onPress={() => onDelete(event)}>
                {text.t('buttons.delete')}
              </Button>
            ) : null}
            <Button testID="event-drawer-close" variant="ghost" onPress={onClose}>
              {text.t('buttons.close')}
            </Button>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8, paddingBottom: 16 },
  actions: { gap: 8, marginTop: 12 },
});
