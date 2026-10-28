/**
 * VTID-05297 (Native Wave 2, home-feed lane) — `/home/notif`, the
 * feature-announcement push tap target. Mirrors the web `src/App.tsx` route:
 * the same feed as `/home`, but deliberately kept out of the ORB front-door's
 * landing-route set so the overlay does not cover the card the notification is
 * about. The native app has no ORB front-door overlay yet (a later ORB wave),
 * so there is nothing to suppress today; the flag is threaded through so the
 * behaviour is wired the moment that overlay lands.
 */
import { HomeScreen } from '../../../src/screens/home/HomeScreen';

export default function HomeNotifRoute() {
  return <HomeScreen suppressFrontDoor />;
}
