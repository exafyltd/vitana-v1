/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — `/autopilot`
 * (AUTOPILOT.MY_JOURNEY): the native My Journey dashboard. The
 * `/autopilot/audiobook` deep link is the autopilot-audiobook lane's own
 * route file next to this one.
 */
import { JourneyScreen } from '../../../src/screens/journey/JourneyScreen';

export default function MyJourneyRoute() {
  return <JourneyScreen />;
}
