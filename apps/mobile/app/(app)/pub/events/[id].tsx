/** VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — `/pub/events/:id`: the public event landing, resolved by id. */
import { useLocalSearchParams } from 'expo-router';
import { PublicEventScreen } from '../../../../src/screens/events/PublicEventScreen';

export default function PublicEventByIdRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublicEventScreen identifier={id} />;
}
