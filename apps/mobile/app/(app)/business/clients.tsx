/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — route /business/clients (ledger row BUSINESS.CLIENTS):
 * the Business Hub opened on the `insights.clients` pill, as the web `pathToMobileTab` maps it.
 */
import { BusinessHubScreen } from '../../../src/screens/business/BusinessHubScreen';
import { pathToMobileTab } from '../../../src/screens/business/tabs';

export default function BusinessclientsRoute() {
  return <BusinessHubScreen initialTab={pathToMobileTab('/business/clients')} />;
}
