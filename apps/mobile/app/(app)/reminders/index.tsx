/**
 * VTID-05530 (N-W2 calendar-reminders) — route /reminders, and ?filter=upcoming|completed|missed
 * (and the legacy ?fire=<id> push link). Ledger row REMINDERS.OVERVIEW.
 */
import { useLocalSearchParams } from 'expo-router';
import { RemindersScreen } from '../../../src/screens/calendar/RemindersScreen';

export default function RemindersRoute() {
  const { filter, fire } = useLocalSearchParams<{ filter?: string; fire?: string }>();
  return <RemindersScreen filter={filter} fireId={fire} />;
}
