/** VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — `/e/game/:slug`: the shareable event-game landing (guests allowed). */
import { useLocalSearchParams } from 'expo-router';
import { EventGameScreen } from '../../../../src/screens/events/EventGameScreen';

export default function EventGameBySlugRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <EventGameScreen slug={slug} publicLanding />;
}
