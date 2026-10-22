/**
 * VTID-05297 (Native Wave 2, home-feed lane) — `/home` (HOME.OVERVIEW), the
 * news + community feed. The `tab` search param selects the All (default) or
 * Community feed (HOME.NEWS_ALL / HOME.NEWS_COMMUNITY); HomeScreen reads it.
 */
import { HomeScreen } from '../../../src/screens/home/HomeScreen';

export default function HomeRoute() {
  return <HomeScreen />;
}
