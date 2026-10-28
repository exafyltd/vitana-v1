/**
 * VTID-05297 (Native Wave 2, home-feed lane) — `/home/compose` (HOME.CREATE_POST),
 * the create-post deep link. A path twin of `/home?compose=1` (Appilix's Android
 * WebView drops query-string deep links on a push tap), mirroring the web
 * `src/pages/Home.tsx` `/home/compose` effect: render the feed with the
 * create-post sheet open on mount.
 */
import { HomeScreen } from '../../../src/screens/home/HomeScreen';

export default function HomeComposeRoute() {
  return <HomeScreen openComposeOnMount />;
}
