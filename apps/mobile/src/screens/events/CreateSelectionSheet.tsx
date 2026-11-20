/**
 * VTID-05531 — "Create new": pick an event or a meetup (web `CreateSelectionDialog`,
 * the event and meetup rows; the live-room row belongs to the live-rooms lane).
 */
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Text, useUITheme } from '../../ports/events';
import { useEventsText } from './text';

export function CreateSelectionSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: 'event' | 'meetup') => void;
}) {
  const text = useEventsText();
  const { colors } = useUITheme();
  return (
    <BottomSheet open={open} onClose={onClose} testID="create-selection">
      <View style={styles.body}>
        <Text variant="title">{text.t('createSelection.title')}</Text>
        <Text variant="body" color={colors.mutedForeground}>
          {text.t('createSelection.description')}
        </Text>
        <Button testID="create-event" variant="outline" onPress={() => onPick('event')}>
          {`${text.t('createSelection.event')} — ${text.t('createSelection.eventDescription')}`}
        </Button>
        <Button testID="create-meetup" onPress={() => onPick('meetup')}>
          {`${text.t('createSelection.meetup')} — ${text.t('createSelection.meetupDescription')}`}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
});
