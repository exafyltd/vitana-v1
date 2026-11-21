/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — route /business/analytics (ledger row BUSINESS.ANALYTICS):
 * the Business Hub opened on the `insights.performance` pill, as the web `pathToMobileTab` maps it.
 */
import { BusinessHubScreen } from '../../../src/screens/business/BusinessHubScreen';
import { pathToMobileTab } from '../../../src/screens/business/tabs';

export default function BusinessanalyticsRoute() {
  return <BusinessHubScreen initialTab={pathToMobileTab('/business/analytics')} />;
}
