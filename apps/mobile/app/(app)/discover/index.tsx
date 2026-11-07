/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover`
 * (DISCOVER.OVERVIEW). The `tab` search param picks Vitana Picks (`suggested`,
 * DISCOVER.AI_PICKS), Categories (DISCOVER.CATEGORIES) or Share & Earn
 * (DISCOVER.SHARE_EARN); DiscoverScreen reads it. `/discover/ai-picks` lands
 * here as `?tab=suggested` (src/navigation/resolve.ts).
 */
import { DiscoverScreen } from '../../../src/screens/discover/DiscoverScreen';

export default function DiscoverRoute() {
  return <DiscoverScreen />;
}
