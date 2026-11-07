/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — the
 * three confirmation screens:
 *  - `/checkout/success` (web src/pages/CheckoutSuccess.tsx): `?checkout_id`
 *    refreshes the cart once; `?deposit_id` polls the deposit every 2.5 s
 *    until succeeded / failed (amount, Back to cart); legacy `?session_id`
 *    toasts; the default order confirmation and its four links;
 *  - `/tickets/success` (TicketPurchaseSuccess.tsx): missing id, confirming
 *    (the 1.5 s verify update on event_ticket_purchases), the error, the pass;
 *  - `/packages/success` (PackagePurchaseSuccess.tsx): missing params,
 *    confirming, the verify-package-payment function, error, the package.
 * Gateway and Supabase are fakes; nothing is paid or written anywhere.
 */
import '../helpers/no-network';
import { router, searchParams } from './discover-mocks';
import './timing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { CheckoutSuccessScreen } from '../../src/screens/commerce/CheckoutSuccessScreen';
import { TicketPurchaseSuccessScreen } from '../../src/screens/commerce/TicketPurchaseSuccessScreen';
import { PackagePurchaseSuccessScreen, packagePrice } from '../../src/screens/commerce/PackagePurchaseSuccessScreen';
import { DEPOSIT_POLL_MS } from '../../src/screens/commerce/data/wallet';
import { TICKET_VERIFY_DELAY_MS } from '../../src/screens/commerce/data/purchases';
import { budget, discoverWrapper, emptyCart, TOKEN } from './discover-helpers';

jest.setTimeout(30000);

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const titles = () => __toastsForTests().map((t) => t.titleKey);

describe('/checkout/success', () => {
  it('?checkout_id: refreshes the one cart once and shows the order confirmation', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    const carts = () => requests.filter((r) => r.path === '/universal-cart').length;
    // the cart is already cached (the member comes from the cart page) …
    const r = render(<CheckoutSuccessScreen />, { wrapper });
    await waitFor(() => expect(carts()).toBe(1));
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    // … and landing with ?checkout_id refetches it once
    searchParams.current = { checkout_id: 'chk-1' };
    r.rerender(<CheckoutSuccessScreen />);
    expect(screen.getByTestId('checkout-success')).toBeTruthy();
    expect(screen.getByText('Order Confirmed!')).toBeTruthy();
    await waitFor(() => expect(carts()).toBe(2));
    await act(async () => {
      await new Promise((res) => setTimeout(res, 50));
    });
    expect(carts()).toBe(2);
    expect(requests.filter((r) => r.path.startsWith('/wallet'))).toEqual([]);
    expect(titles()).toEqual([]);
  });

  it('the confirmation links: View my orders, Continue shopping, Contact support; the four next steps', async () => {
    const { wrapper } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    render(<CheckoutSuccessScreen />, { wrapper });
    expect(screen.getByText("What's Next?")).toBeTruthy();
    expect(screen.getAllByText(/^✓ /)).toHaveLength(4);
    fireEvent.press(screen.getByTestId('checkout-view-orders'));
    fireEvent.press(screen.getByTestId('checkout-continue'));
    fireEvent.press(screen.getByTestId('checkout-support'));
    expect(router.navigate.mock.calls.map((c) => c[0])).toEqual(['/discover/orders', '/discover', '/support']);
  });

  it('legacy ?session_id: the order-confirmed toast', async () => {
    searchParams.current = { session_id: 'cs_1' };
    const { wrapper } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    render(<CheckoutSuccessScreen />, { wrapper });
    await waitFor(() => expect(titles()).toEqual(['toasts.checkoutsuccess.orderConfirmed']));
    expect(__toastsForTests()[0].descKey).toBe('toasts.checkoutsuccess.yourPaymentSuccessfulCheckYourEmail');
  });

  it('?deposit_id: "Confirming payment" while pending, polls every 2.5 s, then "Balance topped up" + the amount + Back to cart', async () => {
    searchParams.current = { deposit_id: 'dep-1' };
    let n = 0;
    const { wrapper, requests } = discoverWrapper({
      'GET /universal-cart': emptyCart,
      'GET /universal-cart/budget': budget,
      'GET /wallet/deposits/dep-1': () => {
        n += 1;
        return { ok: true, deposit: { id: 'dep-1', amount_minor: 2500, currency: 'EUR', status: n < 2 ? 'pending' : 'succeeded', failure_reason: null, created_at: '', updated_at: '' } };
      },
    });
    render(<CheckoutSuccessScreen />, { wrapper });
    expect(screen.getByTestId('deposit-checking')).toHaveTextContent('Confirming payment');
    expect(screen.queryByTestId('deposit-back-to-cart')).toBeNull();
    expect(DEPOSIT_POLL_MS).toBe(2500);
    expect(await screen.findByTestId('deposit-succeeded')).toBeTruthy();
    expect(screen.getByTestId('deposit-amount')).toHaveTextContent('Amount: €25.00');
    const polls = requests.filter((r) => r.path === '/wallet/deposits/dep-1');
    expect(polls.length).toBe(2);
    expect(polls[0].headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community' });
    fireEvent.press(screen.getByTestId('deposit-back-to-cart'));
    expect(router.navigate).toHaveBeenCalledWith('/universal-cart');
    // terminal: polling stops
    await act(async () => {
      await new Promise((r) => setTimeout(r, DEPOSIT_POLL_MS + 300));
    });
    expect(requests.filter((r) => r.path === '/wallet/deposits/dep-1').length).toBe(2);
  });

  it('?deposit_id failed: "Top-up failed" and Back to cart', async () => {
    searchParams.current = { deposit_id: 'dep-2' };
    const { wrapper } = discoverWrapper({
      'GET /universal-cart': emptyCart,
      'GET /universal-cart/budget': budget,
      'GET /wallet/deposits/dep-2': { ok: true, deposit: { id: 'dep-2', amount_minor: 100, currency: 'USD', status: 'failed', failure_reason: 'card', created_at: '', updated_at: '' } },
    });
    render(<CheckoutSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('deposit-failed')).toBeTruthy();
    expect(screen.getByTestId('deposit-back-to-cart')).toBeTruthy();
    expect(screen.queryByTestId('deposit-amount')).toBeNull();
  });
});

const purchaseRow = {
  id: 'p-1',
  ticket_number: 'TKT-0001',
  buyer_email: 'ana@g1-test.example.org',
  buyer_name: 'Ana',
  quantity: 2,
  qr_code_token: 'qr-token-1',
  status: 'pending',
  ticket_type: { name: 'VIP' },
  event: { id: 'e1', title: 'Breathwork Night', start_time: '2026-12-01T18:00:00Z', location: 'Berlin', image_url: null },
};

describe('/tickets/success', () => {
  it('no ?purchase_id: "Invalid request" and Browse events', async () => {
    const { wrapper, db } = discoverWrapper({});
    render(<TicketPurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('ticket-invalid')).toBeTruthy();
    expect(screen.getByText('No purchase information found.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ticket-browse-events'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups');
    expect(db.ops).toEqual([]);
  });

  it('confirming, then the verify update (after 1.5 s) and the pass with the purchase details', async () => {
    searchParams.current = { purchase_id: 'p-1', session_id: 'cs_9' };
    const { wrapper, db } = discoverWrapper({}, { tables: { event_ticket_purchases: [{ ...purchaseRow }] } });
    render(<TicketPurchaseSuccessScreen />, { wrapper });
    expect(screen.getByTestId('ticket-confirming')).toBeTruthy();
    expect(TICKET_VERIFY_DELAY_MS).toBe(1500);
    expect(await screen.findByTestId('ticket-success')).toBeTruthy();
    const select = db.ops.find((o) => o.table === 'event_ticket_purchases' && o.op === 'select');
    expect(select?.filters).toEqual([['eq', 'id', 'p-1']]);
    const update = db.ops.find((o) => o.op === 'update');
    expect(update).toMatchObject({ table: 'event_ticket_purchases', values: { status: 'completed', stripe_session_id: 'cs_9' }, filters: [['eq', 'id', 'p-1'], ['eq', 'status', 'pending']] });
    expect(screen.getByText('Payment Successful!')).toBeTruthy();
    expect(screen.getByTestId('ticket-confirmation')).toHaveTextContent(/ana@g1-test\.example\.org/);
    expect(screen.getByTestId('ticket-title')).toHaveTextContent('Breathwork Night');
    expect(screen.getByTestId('ticket-type')).toHaveTextContent('VIP');
    expect(screen.getByTestId('ticket-number')).toHaveTextContent('TKT-0001');
    expect(screen.getByTestId('ticket-serial')).toHaveTextContent(/^VTN-VTN-20261201-00001$/);
    expect(screen.getByTestId('ticket-qr')).toBeTruthy();
    expect(screen.getByText('Berlin')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    fireEvent.press(screen.getByTestId('ticket-view-all'));
    fireEvent.press(screen.getByTestId('ticket-discover-events'));
    expect(router.navigate.mock.calls.map((c) => c[0])).toEqual(['/my-tickets', '/comm/events-meetups']);
    fireEvent.press(screen.getByTestId('ticket-share'));
    expect(await screen.findByTestId('ticket-share-dialog-content')).toBeTruthy();
  });

  it('without ?session_id: no verify update; missing event fields fall back (Event, General Admission, TBA)', async () => {
    searchParams.current = { purchase_id: 'p-1' };
    const { wrapper, db } = discoverWrapper({}, { tables: { event_ticket_purchases: [{ ...purchaseRow, ticket_type: null, event: null }] } });
    render(<TicketPurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('ticket-success')).toBeTruthy();
    expect(db.ops.filter((o) => o.op === 'update')).toEqual([]);
    expect(screen.getByTestId('ticket-title')).toHaveTextContent('Event');
    expect(screen.getByTestId('ticket-type')).toHaveTextContent('GENERAL ADMISSION');
    expect(screen.getByText('TBA')).toBeTruthy();
  });

  it('a missing purchase: "Something went wrong", the fallback line, View my tickets', async () => {
    searchParams.current = { purchase_id: 'p-404' };
    const { wrapper } = discoverWrapper({}, { tables: { event_ticket_purchases: [] } });
    render(<TicketPurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('ticket-error')).toBeTruthy();
    expect(screen.getByTestId('ticket-error-message')).toHaveTextContent('Could not load your ticket. Please check your email for confirmation.');
    fireEvent.press(screen.getByTestId('ticket-view-my-tickets'));
    expect(router.navigate).toHaveBeenCalledWith('/my-tickets');
  });
});

const packageResult = {
  purchase: {
    id: 'pp-1',
    buyer_email: 'ana@g1-test.example.org',
    buyer_name: 'Ana',
    quantity: 1,
    total_amount_cents: 4900,
    currency: 'eur',
    status: 'completed',
    business_packages: { id: 'b1', title: 'Recovery Pack', description: 'Three sessions', image_url: null, price_cents: 4900, currency: 'eur', package_items: [{ id: 'i1', item_type: 'session', item_name: 'Massage', quantity: 3 }] },
  },
};

describe('/packages/success', () => {
  it('missing ?purchase_id / ?session_id: "Missing purchase information", View my orders, no function call', async () => {
    searchParams.current = { purchase_id: 'pp-1' };
    const { wrapper, db } = discoverWrapper({});
    render(<PackagePurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('package-missing')).toBeTruthy();
    fireEvent.press(screen.getByTestId('package-view-my-orders'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/orders');
    expect(db.client.functions.invoke).not.toHaveBeenCalled();
  });

  it('confirming → verify-package-payment → the package, the toast, Redeem now / View orders', async () => {
    searchParams.current = { purchase_id: 'pp-1', session_id: 'cs_1' };
    const { wrapper, db } = discoverWrapper({});
    (db.client.functions.invoke as jest.Mock).mockImplementation(async () => ({ data: packageResult, error: null }));
    render(<PackagePurchaseSuccessScreen />, { wrapper });
    expect(screen.getByTestId('package-confirming')).toBeTruthy();
    expect(await screen.findByTestId('package-success')).toBeTruthy();
    expect(db.client.functions.invoke).toHaveBeenCalledWith('verify-package-payment', { body: { purchase_id: 'pp-1', session_id: 'cs_1' } });
    expect(titles()).toEqual(['toasts.packagepurchasesuccess.paymentConfirmed']);
    expect(screen.getByText('Recovery Pack')).toBeTruthy();
    expect(screen.getByText('Three sessions')).toBeTruthy();
    expect(screen.getByTestId('package-item-i1')).toHaveTextContent('3x Massage');
    expect(screen.getByTestId('package-total')).toHaveTextContent('€49.00');
    fireEvent.press(screen.getByTestId('package-redeem'));
    fireEvent.press(screen.getByTestId('package-view-orders'));
    expect(router.navigate.mock.calls.map((c) => c[0])).toEqual(['/discover/orders?tab=packages', '/discover/orders']);
  });

  it.each([
    ['the function\'s own error', { data: { error: 'Session not paid' }, error: null }, 'Session not paid'],
    ['a transport error', { data: null, error: { message: 'Edge down' } }, 'Edge down'],
    ['no message', { data: { error: '' }, error: {} }, 'Verification Failed'],
  ])('verification fails (%s): "Verification failed" + the message', async (_l, answer, text) => {
    searchParams.current = { purchase_id: 'pp-1', session_id: 'cs_1' };
    const { wrapper, db } = discoverWrapper({});
    (db.client.functions.invoke as jest.Mock).mockImplementation(async () => answer);
    render(<PackagePurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('package-error')).toBeTruthy();
    expect(screen.getByTestId('package-error-message')).toHaveTextContent(text);
    expect(titles()).toEqual([]);
  });

  it('a thrown non-Error: the "failed to verify" fallback', async () => {
    searchParams.current = { purchase_id: 'pp-1', session_id: 'cs_1' };
    const { wrapper, db } = discoverWrapper({});
    (db.client.functions.invoke as jest.Mock).mockImplementation(async () => {
      throw 'nope';
    });
    render(<PackagePurchaseSuccessScreen />, { wrapper });
    expect(await screen.findByTestId('package-error-message')).toHaveTextContent('Failed to verify payment');
  });

  it('the total is formatted like the web (en-US, the purchase currency)', () => {
    expect(packagePrice(4900, 'usd')).toBe('$49.00');
    expect(packagePrice(4900, 'eur')).toBe('€49.00');
  });
});
