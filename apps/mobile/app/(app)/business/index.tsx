/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — route /business and its `?tab=<leaf>`
 * deep links (services.events, services.packages, sales.promotions, sales.referrals,
 * insights.earnings, insights.growth, …). Covers ledger rows BUSINESS.OVERVIEW and the six
 * BUSINESS.* `?tab=` rows: the `tab` param picks the mode-pill leaf (an invalid value falls back to
 * Snapshot, like the web `resolveMobileTab`).
 */
import { useLocalSearchParams } from 'expo-router';
import { BusinessHubScreen } from '../../../src/screens/business/BusinessHubScreen';
import { resolveMobileTab } from '../../../src/screens/business/tabs';

export default function BusinessRoute() {
  const { tab } = useLocalSearchParams<{ tab?: string | string[] }>();
  return <BusinessHubScreen initialTab={resolveMobileTab('/business', Array.isArray(tab) ? tab[0] : tab)} />;
}
