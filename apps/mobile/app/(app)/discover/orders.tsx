/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — route
 * /discover/orders (DISCOVER.ORDERS; `?tab=active` DISCOVER.ORDERS_ACTIVE,
 * `?tab=history` DISCOVER.ORDERS_HISTORY). The MobileOrdersView twin reads `tab`.
 */
import { OrdersScreen } from '../../../src/screens/marketplace-orders/OrdersScreen';

export default function OrdersRoute() {
  return <OrdersScreen />;
}
