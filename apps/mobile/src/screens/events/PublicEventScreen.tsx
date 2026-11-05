/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — the public event
 * landing for `/e/:slug` and `/pub/events/:id`: the native twin of
 * `src/pages/PublicEventLanding.tsx`. The slug or id resolves through the same
 * `resolve_event_by_slug` RPC. States: loading, not found, error, loaded. The join
 * action opens the event's drawer in the events hub; ticket checkout is not part of
 * this port.
 */
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Spinner, Text, resolveEventCover, useUITheme } from '../../ports/events';
import { usePublicEvent } from './data/hooks';
import { useEventsText } from './text';

export function PublicEventScreen({ identifier }: { identifier: string | undefined }) {
  const text = useEventsText();
  const { colors } = useUITheme();
  const query = usePublicEvent(identifier);

  if (query.isPending) {
    return (
      <View testID="public-event-loading" style={styles.center}>
        <Spinner />
      </View>
    );
  }
  if (query.isError) {
    return (
      <View testID="public-event-error" style={styles.center}>
        <Text variant="body">{text.t('errors.tryAgain')}</Text>
        <Button variant="outline" onPress={() => void query.refetch()}>
          {text.t('buttons.retry')}
        </Button>
      </View>
    );
  }
  const event = query.data;
  if (!event) {
    return (
      <View testID="public-event-not-found" style={styles.center}>
        <Text variant="title">{text.t('screens.publiceventlanding.eventNotFound')}</Text>
        <Text variant="body" color={colors.mutedForeground}>
          {text.t('screens.publiceventlanding.discoverMoreEventsLongevityCommunities')}
        </Text>
        <Button variant="outline" onPress={() => router.replace('/home')}>
          {text.t('screens.publiceventlanding.goHome')}
        </Button>
      </View>
    );
  }

  const cover = resolveEventCover(event as never);
  return (
    <ScrollView testID="public-event" contentContainerStyle={styles.content}>
      {cover.src ? <Image source={{ uri: cover.src }} style={styles.cover} accessibilityIgnoresInvertColors /> : null}
      <Text testID="public-event-title" variant="title">
        {event.title}
      </Text>
      <Card style={styles.card}>
        <Text variant="label" color={colors.mutedForeground}>
          {text.t('screens.publiceventlanding.dateTime')}
        </Text>
        <Text variant="body">{text.eventTimeLabel(event.start_time)}</Text>
        {event.location ? (
          <>
            <Text variant="label" color={colors.mutedForeground}>
              {text.t('screens.publiceventlanding.location')}
            </Text>
            <Text variant="body">{event.location}</Text>
          </>
        ) : null}
        <Text variant="label" color={colors.mutedForeground}>
          {text.t('screens.publiceventlanding.hostedBy')}
        </Text>
        <Text variant="body">{event.creator_display_name ?? text.t('eventDrawer.communityHost')}</Text>
        {typeof event.participant_count === 'number' ? (
          <Text variant="body">{text.t('eventDrawer.attendingCount', { current: event.participant_count })}</Text>
        ) : null}
      </Card>
      {event.description ? <Text variant="body">{event.description}</Text> : null}
      <Button testID="public-event-join" onPress={() => router.push(`/comm/events-meetups?event=${encodeURIComponent(event.id)}` as never)}>
        {text.t('eventCta.joinThisEvent')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { alignItems: 'center', gap: 12, padding: 24 },
  cover: { width: '100%', height: 180, borderRadius: 16 },
  card: { gap: 6, padding: 14 },
});
