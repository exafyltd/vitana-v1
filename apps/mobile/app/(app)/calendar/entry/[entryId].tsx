/**
 * VTID-05530 (N-W2 calendar-reminders) — route /calendar/entry/:entryId (reminder notifications
 * link here). Ledger row `/calendar/entry/:entryId`: the calendar on that entry's day, with the
 * entry open; closing it returns to /calendar.
 */
import { useLocalSearchParams } from 'expo-router';
import { CalendarScreen } from '../../../../src/screens/calendar/CalendarScreen';

export default function CalendarEntryRoute() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  return <CalendarScreen entryId={entryId} />;
}
