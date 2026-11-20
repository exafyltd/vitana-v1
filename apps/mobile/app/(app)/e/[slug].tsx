/** VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — `/e/:slug`: the public event landing, resolved by slug. */
import { useLocalSearchParams } from 'expo-router';
import { PublicEventScreen } from '../../../src/screens/events/PublicEventScreen';

export default function PublicEventBySlugRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <PublicEventScreen identifier={slug} />;
}
