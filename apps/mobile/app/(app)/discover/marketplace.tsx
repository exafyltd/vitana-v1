/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — route
 * /discover/marketplace (DISCOVER.MARKETPLACE; `?view=open` DISCOVER.MARKETPLACE_OPEN,
 * `?view=mine` DISCOVER.MARKETPLACE_MINE). The screen reads the `view` param.
 */
import { MarketplaceScreen } from '../../../src/screens/marketplace-orders/MarketplaceScreen';

export default function MarketplaceRoute() {
  return <MarketplaceScreen />;
}
