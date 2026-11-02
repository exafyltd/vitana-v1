/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — native
 * port of `src/pages/discover/Orders.tsx`, its phone branch (`if (isMobile)`,
 * :654-666): the unified orders of the member — CJ product orders
 * (`cj_orders`), event tickets (`useMyTickets`) and gift vouchers
 * (`useMyVouchers`) — split into Active / History and rendered by the
 * `MobileOrdersView` twin. While the member has no tickets the web shows its
 * three sample tickets with the "Sample Data" banner (`isShowingMockData`),
 * and so does this port. Rows `DISCOVER.ORDERS`, `DISCOVER.ORDERS_ACTIVE`
 * (`?tab=active`), `DISCOVER.ORDERS_HISTORY` (`?tab=history`). View / track
 * only — no purchase control, so no iOS-IAP-gate flag (the rail's gift
 * voucher keeps the shell's iOS gate).
 */
import { useMemo, type ReactElement } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { MobileOrdersView } from './MobileOrdersView';
import { buildOrders, mockTickets, useCjOrders, useMyTickets, useMyVouchers } from './data/orders';

export function OrdersScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const cj = useCjOrders(userId);
  const tickets = useMyTickets(userId);
  const vouchers = useMyVouchers(userId);

  const realTickets = useMemo(() => tickets.data ?? [], [tickets.data]);
  const ticketsLoading = tickets.isLoading;
  const displayTickets = useMemo(() => (realTickets.length > 0 ? realTickets : mockTickets(userId, t)), [realTickets, userId, t]);
  const isShowingMockData = realTickets.length === 0 && !ticketsLoading;

  const { active, history } = useMemo(
    () => buildOrders({ cjOrders: cj.data ?? [], tickets: displayTickets, vouchers: vouchers.data ?? [], t, locale }),
    [cj.data, displayTickets, vouchers.data, t, locale],
  );

  // `loading` (cj) starts true on the web and only clears after the signed-in fetch; vouchers load only when signed in.
  const isLoading = (!!userId && cj.isLoading) || ticketsLoading || (!!userId && vouchers.isLoading);

  return <MobileOrdersView activeOrders={active} historyOrders={history} isLoading={isLoading} isShowingMockData={isShowingMockData} />;
}
