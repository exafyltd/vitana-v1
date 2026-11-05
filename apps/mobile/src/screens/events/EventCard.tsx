/**
 * VTID-05531 — one event or meetup card of the hub list (a `VCard`-style card on
 * the N2 `Card`): cover, start label, place or online, host and attendee count,
 * all through `useEventsText` (locale-format routing) and the catalogs.
 */
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Card, Text, resolveEventCover, useUITheme } from '../../ports/events';
import type { CommunityEvent } from './data/events';
import { useEventsText } from './text';

export function EventCard({ event, onPress }: { event: CommunityEvent; onPress: () => void }) {
  const text = useEventsText();
  const { colors } = useUITheme();
  const cover = resolveEventCover(event as never);
  const place = event.virtual_link ? text.t('screens.common.virtualMeetup') : event.location ?? '';
  return (
    <Pressable testID={`event-card-${event.id}`} accessibilityRole="button" accessibilityLabel={event.title} onPress={onPress}>
      <Card style={styles.card}>
        {cover.src ? <Image source={{ uri: cover.src }} style={styles.cover} accessibilityIgnoresInvertColors /> : null}
        <View style={styles.body}>
          <Text variant="label" color={colors.mutedForeground}>
            {text.eventTimeLabel(event.start_time)}
          </Text>
          <Text variant="title">{event.title}</Text>
          {place ? (
            <Text variant="caption" color={colors.mutedForeground}>
              {place}
            </Text>
          ) : null}
          <Text variant="caption" color={colors.mutedForeground}>
            {event.creator_display_name ?? text.t('eventDrawer.communityHost')}
          </Text>
          <Text variant="caption" color={colors.mutedForeground}>
            {text.t('eventDrawer.attendingCount', { current: event.participant_count })}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', padding: 0 },
  cover: { width: '100%', height: 140 },
  body: { padding: 14, gap: 4 },
});
