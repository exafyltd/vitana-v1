/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — route /business/sell-earn (ledger row BUSINESS.SELL_EARN):
 * the Business Hub opened on the `sales.inventory` pill, as the web `pathToMobileTab` maps it.
 */
import { BusinessHubScreen } from '../../../src/screens/business/BusinessHubScreen';
import { pathToMobileTab } from '../../../src/screens/business/tabs';

export default function BusinesssellearnRoute() {
  return <BusinessHubScreen initialTab={pathToMobileTab('/business/sell-earn')} />;
}
