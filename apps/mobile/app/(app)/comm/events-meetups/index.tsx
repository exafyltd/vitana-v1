/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — `/comm/events-meetups`
 * (COMM.EVENTS; `?tab=hot|today|upcoming|following` is read by the screen): the native
 * events and meetups hub.
 */
import { EventsMeetupsScreen } from '../../../../src/screens/events/EventsMeetupsScreen';

export default function EventsMeetupsRoute() {
  return <EventsMeetupsScreen />;
}
