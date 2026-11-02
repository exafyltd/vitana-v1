/**
 * VTID-05511 — /discover/orders (DISCOVER.ORDERS, _ACTIVE, _HISTORY), the
 * MobileOrdersView twin: the three web reads (cj_orders, the member's
 * completed ticket purchases with type + event, voucher_orders) built
 * unchanged, the active / history split, the mode pill and `?tab=`, search,
 * the sample-ticket banner, empty and loading, the order detail sheet (ticket
 * pass with QR, voucher PDF + e-mail requests — built, never sent to a live
 * system), the rail with the Index / Autopilot chips; and /my-tickets
 * (DISCOVER.MY_TICKETS) list / tabs / detail / empty.
 */
import '../helpers/no-network';
import { openURL, router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { OrdersScreen } from '../../src/screens/marketplace-orders/OrdersScreen';
import { MyTicketsScreen } from '../../src/screens/marketplace-orders/MyTicketsScreen';
import { buildOrders, mockTickets, statusLabel } from '../../src/screens/marketplace-orders/data/orders';
import { qrMatrix, qrPath } from '../../src/screens/marketplace-orders/ticket/QrCode';
import { ticketSerial } from '../../src/screens/marketplace-orders/ticket/EventTicket';
import { FAIL, USER, commerceWrapper, cjRow, pastTicketRow, setOS, ticketRow, voucherRow } from './helpers';

// Renders both the orders screen and /my-tickets.
jest.setTimeout(30000);

afterEach(() => {
  searchParams.current = {};
  router.navigate.mockClear();
  openURL.mockClear();
  __clearToastsForTests();
  overlayBus.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const tables = (over: Record<string, unknown> = {}) => ({
  cj_orders: [cjRow(), cjRow({ id: 'cj-2-bbbbbbbb', status: 'delivered', created_at: '2026-09-01T10:00:00Z', order_items: [{ item_name: 'Omega 3' }] })],
  event_ticket_purchases: [ticketRow({ buyer_id: USER }), pastTicketRow({ buyer_id: USER })],
  voucher_orders: [voucherRow(), voucherRow({ id: 'v-2', tier: 'test', status: 'redeemed', amount_cents: 49, created_at: '2026-08-01T10:00:00Z' })],
  ...over,
});

describe('the web reads, unchanged', () => {
  it('cj_orders (all, newest first), the completed tickets with type + event, and the member’s voucher orders', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: tables() as never });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-cj-1-aaaaaaaa')).toBeTruthy());
    const sel = (t: string) => log.find((o) => o.op === 'select' && o.table === t)?.args;
    expect(sel('cj_orders')).toMatchObject({ select: '*', filters: [], order: ['created_at', { ascending: false }] });
    expect(sel('event_ticket_purchases').select.replace(/\s+/g, ' ').trim()).toBe('*, ticket_type:event_ticket_types(*), event:global_community_events(id, title, start_time, location, image_url)');
    expect(sel('event_ticket_purchases').filters).toEqual([
      ['eq', 'buyer_id', USER],
      ['eq', 'status', 'completed'],
    ]);
    expect(sel('voucher_orders')).toMatchObject({ select: '*', filters: [['eq', 'buyer_user_id', USER]], order: ['created_at', { ascending: false }] });
  });
});

describe('active / history', () => {
  it('active = undelivered CJ orders + upcoming tickets + paid vouchers, newest first; no sample banner with real tickets', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables() as never });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-cj-1-aaaaaaaa')).toBeTruthy());
    const ids = within(screen.getByTestId('orders-active'))
      .getAllByTestId(/^order-card-/)
      .map((n) => n.props.testID);
    expect(ids).toEqual(['order-card-cj-1-aaaaaaaa', 'order-card-v-1', 'order-card-t-up']);
    const cj = within(screen.getByTestId('order-card-cj-1-aaaaaaaa'));
    expect(cj.getByText('Magnesium Glycinate')).toBeTruthy();
    expect(cj.getByText('CJDropshipping')).toBeTruthy();
    expect(cj.getByText('In Transit')).toBeTruthy();
    expect(cj.getByText('$29.9')).toBeTruthy();
    const v = within(screen.getByTestId('order-card-v-1'));
    expect(v.getByText('Maxina Experience Voucher')).toBeTruthy();
    expect(v.getByText('€99.00')).toBeTruthy();
    expect(v.getByText('Active')).toBeTruthy();
    const tk = within(screen.getByTestId('order-card-t-up'));
    expect(tk.getByText('Sunrise Breathwork')).toBeTruthy();
    expect(tk.getByText('Upcoming')).toBeTruthy();
    expect(tk.getByText('× 2')).toBeTruthy();
    expect(screen.queryByTestId('orders-sample-banner')).toBeNull();
  });

  it('the mode pill switches to History (delivered CJ, past tickets, redeemed vouchers); ?tab=history opens it directly', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables() as never });
    const r = render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-cj-1-aaaaaaaa')).toBeTruthy());
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-history'));
    await waitFor(() => expect(screen.getByTestId('orders-history')).toBeTruthy());
    const ids = () =>
      within(screen.getByTestId('orders-history'))
        .getAllByTestId(/^order-card-/)
        .map((n) => n.props.testID);
    expect(ids()).toEqual(['order-card-t-past', 'order-card-cj-2-bbbbbbbb', 'order-card-v-2']);
    expect(within(screen.getByTestId('order-card-t-past')).getByText('Attended')).toBeTruthy();
    expect(within(screen.getByTestId('order-card-cj-2-bbbbbbbb')).getByText('Delivered')).toBeTruthy();
    expect(within(screen.getByTestId('order-card-v-2')).getByText('Redeemed')).toBeTruthy();
    r.unmount();

    searchParams.current = { tab: 'history' };
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('orders-history')).toBeTruthy());
    searchParams.current = { tab: 'nonsense' };
  });

  it('search filters by title, subtitle or ticket number', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables() as never });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-cj-1-aaaaaaaa')).toBeTruthy());
    fireEvent.press(screen.getByTestId('orders-search-open'));
    fireEvent.changeText(screen.getByTestId('orders-search-input'), '000001');
    expect(within(screen.getByTestId('orders-active')).getAllByTestId(/^order-card-/).map((n) => n.props.testID)).toEqual(['order-card-t-up']);
    fireEvent.changeText(screen.getByTestId('orders-search-input'), 'maxina gift');
    expect(within(screen.getByTestId('orders-active')).getAllByTestId(/^order-card-/).map((n) => n.props.testID)).toEqual(['order-card-v-1']);
  });

  it('empty: with no orders at all the sample tickets show (banner) and Active is empty with both CTAs', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { cj_orders: [], event_ticket_purchases: [], voucher_orders: [] } });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('orders-sample-banner')).toBeTruthy());
    expect(screen.getByText('Sample Data')).toBeTruthy();
    expect(screen.getByTestId('orders-empty-active')).toBeTruthy();
    fireEvent.press(screen.getByTestId('orders-browse-products'));
    expect(router.navigate).toHaveBeenCalledWith('/discover');
    fireEvent.press(screen.getByTestId('orders-find-events'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
    // the three sample tickets are in History (their events are in the past)
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-history'));
    await waitFor(() => expect(screen.getByTestId('order-card-mock-1')).toBeTruthy());
    expect(screen.getByText('VITANA Wellness Summit 2025')).toBeTruthy();
  });

  it('error: a failing ticket read toasts "Failed to load your tickets" and the rest still renders', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables({ event_ticket_purchases: FAIL }) as never });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-cj-1-aaaaaaaa')).toBeTruthy());
    expect(__toastsForTests().some((x) => x.titleKey === 'toasts.hooks.error' && x.descKey === 'toasts.hooks.failedLoadYourTickets')).toBe(true);
  });

  it('loading: three skeleton rows while the reads are in flight', () => {
    const { wrapper } = commerceWrapper({}, { tables: tables() as never });
    render(<OrdersScreen />, { wrapper });
    expect(screen.getByTestId('orders-loading')).toBeTruthy();
  });
});

describe('the order detail sheet', () => {
  it('a ticket: order info, the event pass with its QR and serial, and "use the ticket view" for the PDF', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables() as never });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-t-up')).toBeTruthy());
    fireEvent.press(screen.getByTestId('order-card-t-up'));
    expect(screen.getByText('Order Details')).toBeTruthy();
    expect(screen.getByTestId('mo-order-reference')).toBeTruthy();
    expect(screen.getByTestId('mo-order-your-ticket')).toBeTruthy();
    expect(screen.getByTestId('mo-ticket-qr')).toBeTruthy();
    expect(screen.getByTestId('mo-ticket-number').props.children).toBe('VTN-20261112-000001');
    fireEvent.press(screen.getByTestId('mo-order-download'));
    expect(__toastsForTests().some((x) => x.titleKey === 'voucher.toast.useTicketView')).toBe(true);
  });

  it('a voucher: code, Download PDF → voucher-download-pdf then the signed PDF; send to recipient → voucher-send-email', async () => {
    const { wrapper, log } = commerceWrapper({}, { tables: tables() as never, functions: { 'voucher-download-pdf': { success: true, voucher: { code: 'MAX-ABCD-1234' }, signedPdfUrl: 'https://files.example.org/v.pdf' }, 'voucher-send-email': { ok: true } } });
    render(<OrdersScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('order-card-v-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('order-card-v-1'));
    expect(screen.getByTestId('mo-order-voucher-code').props.children).toBe('MAX-ABCD-1234');
    await act(async () => fireEvent.press(screen.getByTestId('mo-order-download')));
    expect(log.find((o) => o.op === 'function' && o.table === 'voucher-download-pdf')?.args).toEqual({ orderId: 'v-1' });
    expect(openURL).toHaveBeenCalledWith('https://files.example.org/v.pdf');
    fireEvent.press(screen.getByTestId('mo-order-send-recipient'));
    fireEvent.changeText(screen.getByTestId('mo-order-email'), 'friend@example.org');
    fireEvent.changeText(screen.getByTestId('mo-order-name'), 'Kim');
    fireEvent.changeText(screen.getByTestId('mo-order-message'), 'Enjoy!');
    await act(async () => fireEvent.press(screen.getByTestId('mo-order-email-send')));
    expect(log.find((o) => o.op === 'function' && o.table === 'voucher-send-email')?.args).toEqual({ orderId: 'v-1', recipientEmail: 'friend@example.org', recipientName: 'Kim', message: 'Enjoy!' });
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'voucher.toast.voucherSent')).toBe(true));
  });
});

describe('the sticky compact rail', () => {
  it('Search · mode pill · Calendar · Life Compass · Gift Voucher · Vitana Index · Autopilot; the chips open their overlays', async () => {
    const restore = setOS('android');
    try {
      const { wrapper } = commerceWrapper({ 'GET /autopilot/recommendations': { ok: true, recommendations: [{ id: 'r1', status: 'new' }, { id: 'r2', status: 'activated' }] } }, { tables: { ...tables(), vitana_index_scores: [{ user_id: USER, score_total: 612, date: '2026-11-01' }] } as never });
      render(<OrdersScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId('mo-autopilot-count')).toBeTruthy());
      const ids = within(screen.getByTestId('mo-utility-rail'))
        .getAllByRole('button')
        .map((b) => b.props.testID);
      expect(ids).toEqual(['orders-search-open', 'mode-pill', 'mo-calendar-button', 'mo-life-compass', 'mo-gift-voucher', 'mo-index-chip', 'mo-autopilot-chip']);
      await waitFor(() => expect(screen.getByTestId('mo-index-value').props.children).toBe('612'));
      expect(within(screen.getByTestId('mo-autopilot-count')).getByText('1')).toBeTruthy();
      const events: string[] = [];
      overlayBus.on('autopilot:open', () => events.push('autopilot'));
      overlayBus.on('vitana:open-index', () => events.push('index'));
      fireEvent.press(screen.getByTestId('mo-autopilot-chip'));
      fireEvent.press(screen.getByTestId('mo-index-chip'));
      fireEvent.press(screen.getByTestId('mo-calendar-button'));
      expect(events).toEqual(['autopilot', 'index']);
      expect(router.navigate).toHaveBeenCalledWith('/calendar');
    } finally {
      restore();
    }
  });
});

describe('pure order assembly', () => {
  it('statuses: known ones from the catalog, others capitalised; ticket status rules', () => {
    const t = (k: string) => k;
    expect(statusLabel('shipped', t)).toBe('discoverCommerceNative.marketplaceOrders.orders.status.shipped');
    expect(statusLabel('on_hold', t)).toBe('On_hold');
    const now = new Date('2026-11-02T12:00:00Z');
    const rows = [ticketRow({ id: 'a', status: 'refunded' }), pastTicketRow({ id: 'b', checked_in_at: null })];
    const { active, history } = buildOrders({ cjOrders: [], tickets: rows as never, vouchers: [], t, locale: 'en', now });
    expect(active.map((o) => [o.id, o.status])).toEqual([['a', 'refunded']]);
    expect(history.map((o) => [o.id, o.status])).toEqual([['b', 'expired']]);
    expect(mockTickets(null, t).map((x) => x.qr_code_token)).toEqual(['MOCK-QR-TOKEN-001', 'MOCK-QR-TOKEN-002', 'MOCK-QR-TOKEN-003']);
  });

  it('the QR encoder (level H) and the qrcode.react path; the tenant serial', () => {
    const m = qrMatrix('MOCK-QR-TOKEN-001');
    expect(m.length).toBe(25);
    // finder patterns: dark corners, light separator
    expect([m[0][0], m[0][6], m[6][0], m[7][7], m[0][24], m[24][0]]).toEqual([true, true, true, false, true, true]);
    expect(qrPath([[true, true, false], [false, true, true]])).toBe('M0 0h2v1H0zM1,1 h2v1H1z');
    expect(ticketSerial(new Date(2025, 0, 15, 18), 1)).toBe('VTN-VTN-20250115-00001');
  });
});

describe('/my-tickets', () => {
  it('lists upcoming tickets, switches to Past, opens the pass dialog', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { event_ticket_purchases: [ticketRow(), pastTicketRow()] } });
    render(<MyTicketsScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('ticket-card-t-up')).toBeTruthy());
    expect(screen.getByTestId('tickets-count').props.children).toBe('2ticketspurchased');
    expect(screen.getByText('Upcoming (1)')).toBeTruthy();
    expect(within(screen.getByTestId('ticket-card-t-up')).getByText('Standard')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tickets-tab-past'));
    await waitFor(() => expect(screen.getByTestId('ticket-card-t-past')).toBeTruthy());
    expect(screen.getByTestId('ticket-checked-t-past')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ticket-card-t-past'));
    expect(screen.getByTestId('tickets-dialog-content')).toBeTruthy();
    expect(screen.getByTestId('mo-ticket-title').props.children).toBe('Forest Bathing Walk');
    fireEvent.press(screen.getByTestId('mo-ticket-share'));
    expect(screen.getByTestId('mo-ticket-share-dialog-content')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mo-ticket-share-whatsapp'));
    expect(openURL.mock.calls[0][0]).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('empty: "No tickets yet" and Browse Events', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { event_ticket_purchases: [] } });
    render(<MyTicketsScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('tickets-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('tickets-browse-events'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
  });

  it('loading skeletons, then the list', async () => {
    const { wrapper } = commerceWrapper({}, { tables: { event_ticket_purchases: [ticketRow()] } });
    render(<MyTicketsScreen />, { wrapper });
    expect(screen.getByTestId('tickets-loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('ticket-card-t-up')).toBeTruthy());
  });
});
