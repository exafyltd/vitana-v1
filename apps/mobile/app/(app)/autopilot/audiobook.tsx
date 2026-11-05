/**
 * VTID-05460 (native-wave2-journey-autopilot-r2/autopilot-audiobook) —
 * `/autopilot/audiobook`, the Audiobook push deep link (VTID-04763): renders
 * My Journey, starts the app-wide player and settles on `/autopilot`.
 */
import { AudiobookDeepLinkScreen } from '../../../src/screens/audiobook/AudiobookDeepLink';

export default function AudiobookDeepLinkRoute() {
  return <AudiobookDeepLinkScreen />;
}
