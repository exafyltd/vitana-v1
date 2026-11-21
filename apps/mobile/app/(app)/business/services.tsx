/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — route /business/services (ledger row BUSINESS.SERVICES):
 * the Business Hub opened on the `services.services` pill, as the web `pathToMobileTab` maps it.
 */
import { BusinessHubScreen } from '../../../src/screens/business/BusinessHubScreen';
import { pathToMobileTab } from '../../../src/screens/business/tabs';

export default function BusinessservicesRoute() {
  return <BusinessHubScreen initialTab={pathToMobileTab('/business/services')} />;
}
