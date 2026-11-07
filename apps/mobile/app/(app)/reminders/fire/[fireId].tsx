/**
 * VTID-05530 (N-W2 calendar-reminders) — route /reminders/fire/:fireId (the reminder push link).
 * Ledger row `/reminders/fire/:fireId`: the reminders list with the interrupt card on top.
 */
import { useLocalSearchParams } from 'expo-router';
import { RemindersScreen } from '../../../../src/screens/calendar/RemindersScreen';

export default function ReminderFireRoute() {
  const { fireId } = useLocalSearchParams<{ fireId?: string }>();
  return <RemindersScreen fireId={fireId} />;
}
