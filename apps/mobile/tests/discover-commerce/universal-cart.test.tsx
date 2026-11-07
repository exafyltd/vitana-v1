/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/universal-cart` (web src/pages/UniversalCart.tsx): role-blocked / loading
 * / error / empty, the hydrated lines, quantity steppers, remove, save for
 * later ↔ move to cart, the budget meter + advisory, the wallet balance card,
 * checkout idempotency (same contents → same key, changed → new key, landed →
 * cleared), the success / duplicate toasts and /checkout/success, affiliate
 * redirects, INSUFFICIENT_BALANCE → the prefilled AddMoneyDialog → the Stripe
 * deposit, and the Vitana agent (propose / reorder / safety / errors).
 * Every request goes to a fake gateway; no order or payment is ever placed.
 */
import '../helpers/no-network';
import { openBrowser, router } from './discover-mocks';
import './timing';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { randomUUID } from 'expo-crypto';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { UniversalCartScreen } from '../../src/screens/commerce/UniversalCartScreen';
import { checkoutErrorKey, CHECKOUT_ERROR_KEYS, mintCheckoutKey } from '../../src/screens/commerce/data/cart';
import { budget, discoverWrapper, emptyCart, FAIL, product, status, TOKEN, UUID, type Req } from './discover-helpers';

jest.setTimeout(30000);

const openURL = jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);

afterEach(() => {
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const titles = () => __toastsForTests().map((t) => t.titleKey);

type Line = Record<string, unknown> & { id: string; quantity: number; metadata: Record<string, unknown> };
const line = (n: number, extra: Partial<Line> = {}): Line => ({
  id: `line-${n}`,
  cart_id: 'c1',
  item_type: 'partner_product',
  product_id: UUID(n),
  merchant_id: null,
  quantity: 1,
  unit_price_cents_snapshot: 1500,
  currency_snapshot: 'eur',
  source_surface: 'community',
  source_ref: null,
  status: 'active',
  metadata: { source_label: `Snapshot ${n}` },
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...extra,
});

/** A stateful fake cart: PATCH / DELETE change the lines the next GET returns. */
function cartRoutes(initial: Line[], extra: Record<string, unknown> = {}) {
  let lines = initial.map((l) => ({ ...l }));
  const routes: Record<string, unknown> = {
    'GET /universal-cart': () => ({ ok: true, cart: lines.length ? { id: 'c1' } : null, items: lines }),
    'GET /universal-cart/budget': budget,
    'GET /wallet/balance': { ok: true, accounts: [{ currency: 'EUR', balance_minor: 2500, status: 'active', updated_at: '' }] },
    [`GET /discover/product/${UUID(1)}`]: { ok: true, product: product(1, { title: 'Hydrated One' }) },
    ...extra,
  };
  for (const l of initial) {
    routes[`PATCH /universal-cart/items/${l.id}`] = (req: Req) => {
      lines = lines.map((x) => (x.id === l.id ? { ...x, ...(req.body.quantity ? { quantity: req.body.quantity } : {}), ...(req.body.metadata ? { metadata: req.body.metadata } : {}) } : x));
      return { ok: true, item: lines.find((x) => x.id === l.id) };
    };
    routes[`DELETE /universal-cart/items/${l.id}`] = () => {
      lines = lines.filter((x) => x.id !== l.id);
      return { ok: true, item: l };
    };
  }
  return { routes, set: (next: Line[]) => (lines = next) };
}

const mint = () => {
  let n = 0;
  return jest.fn(() => `00000000-0000-4000-8000-0000000000${String(++n).padStart(2, '0')}`);
};

describe('/universal-cart — states', () => {
  it('role-blocked (403 cart_unavailable_for_role): the community-only state', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': status(403, { ok: false, error: 'cart_unavailable_for_role', role: 'professional' }) });
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('cart-role-blocked')).toBeTruthy();
    expect(screen.getByText('Cart')).toBeTruthy();
    expect(screen.getByText("The cart isn't available for this role")).toBeTruthy();
    expect(requests.find((r) => r.path === '/universal-cart')?.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community' });
  });

  it('loading, then a failing cart (500, one retry like the web): the error state', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': FAIL, 'GET /universal-cart/budget': budget });
    render(<UniversalCartScreen />, { wrapper });
    expect(screen.getByTestId('cart-loading')).toBeTruthy();
    expect(await screen.findByTestId('cart-error')).toBeTruthy();
    expect(screen.getByText("We couldn't load your cart")).toBeTruthy();
    expect(requests.filter((r) => r.path === '/universal-cart')).toHaveLength(2);
  });

  it('empty: the empty cart + Discover link; the Saved tab is empty too', async () => {
    const { wrapper } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('cart-empty')).toBeTruthy();
    expect(screen.queryByTestId('cart-checkout')).toBeNull();
    expect(screen.queryByTestId('wallet-balance-card')).toBeNull();
    fireEvent.press(screen.getByTestId('cart-to-discover'));
    expect(router.navigate).toHaveBeenCalledWith('/discover');
    fireEvent.press(screen.getByTestId('cart-tab-saved'));
    expect(await screen.findByTestId('saved-empty')).toBeTruthy();
  });

  it('header: title, subtitle, Close goes back', async () => {
    const { wrapper } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    render(<UniversalCartScreen />, { wrapper });
    await screen.findByTestId('universal-cart');
    expect(screen.getByText('Products, packages, and recommendations from Discover — all in one place.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('/universal-cart — lines', () => {
  it('hydrates titles, falls back to the snapshot label, shows the snapshot price and the wallet balance', async () => {
    const { routes } = cartRoutes([line(1), line(2)]);
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByText('Hydrated One')).toBeTruthy();
    expect(await screen.findByText('Snapshot 2')).toBeTruthy();
    expect(screen.getAllByText('€15.00').length).toBe(2);
    expect(await screen.findByTestId('wallet-balance')).toHaveTextContent('€25.00');
    expect(requests.find((r) => r.path === '/wallet/balance')?.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community' });
    fireEvent.press(screen.getByTestId(`view-product-${UUID(2)}`));
    expect(router.navigate).toHaveBeenCalledWith(`/discover/product/${UUID(2)}`);
  });

  it('quantity steppers PATCH { quantity }; − is disabled at 1; a failing PATCH toasts', async () => {
    const { routes } = cartRoutes([line(1)]);
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    await screen.findByTestId('qty-line-1');
    expect(screen.getByTestId('qty-dec-line-1')).toBeDisabled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('qty-inc-line-1'));
    });
    expect(requests.find((r) => r.method === 'PATCH')).toMatchObject({ path: '/universal-cart/items/line-1', body: { quantity: 2 } });
    await waitFor(() => expect(screen.getByTestId('qty-value-line-1')).toHaveTextContent('2'));
    await waitFor(() => expect(screen.getByTestId('qty-dec-line-1')).not.toBeDisabled());
    await act(async () => {
      fireEvent.press(screen.getByTestId('qty-dec-line-1'));
    });
    expect(requests.filter((r) => r.method === 'PATCH').map((r) => r.body)).toEqual([{ quantity: 2 }, { quantity: 1 }]);
    // budget refreshed with the cart after a change
    expect(requests.filter((r) => r.path === '/universal-cart/budget').length).toBeGreaterThan(1);
  });

  it('a failing PATCH: the "failed" toast', async () => {
    const { routes } = cartRoutes([line(1)]);
    const { wrapper } = discoverWrapper({ ...routes, 'PATCH /universal-cart/items/line-1': FAIL });
    render(<UniversalCartScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('qty-inc-line-1'));
    });
    expect(titles()).toEqual(['universalCart.addButton.failed']);
  });

  it('remove: DELETE without a body; the line goes', async () => {
    const { routes } = cartRoutes([line(1), line(2)]);
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('line-remove-line-2'));
    });
    expect(requests.find((r) => r.method === 'DELETE')).toMatchObject({ path: '/universal-cart/items/line-2', body: undefined });
    await waitFor(() => expect(screen.queryByTestId('cart-line-line-2')).toBeNull());
  });

  it('save for later → the Saved tab → move to cart (PATCH metadata.saved)', async () => {
    const { routes } = cartRoutes([line(1), line(2)]);
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('line-save-line-2'));
    });
    expect(requests.find((r) => r.method === 'PATCH')?.body).toEqual({ metadata: { source_label: 'Snapshot 2', saved: true } });
    await waitFor(() => expect(screen.queryByTestId('cart-line-line-2')).toBeNull());
    fireEvent.press(screen.getByTestId('cart-tab-saved'));
    expect(await screen.findByTestId('saved-line-line-2')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('line-move-line-2'));
    });
    expect(requests.filter((r) => r.method === 'PATCH').pop()?.body).toEqual({ metadata: { source_label: 'Snapshot 2', saved: false } });
    fireEvent.press(screen.getByTestId('cart-tab-cart'));
    expect(await screen.findByTestId('cart-line-line-2')).toBeTruthy();
  });
});

describe('/universal-cart — budget', () => {
  it('a cap: title, the "near" pill, the projected progress, the line and the near advisory', async () => {
    const { routes } = cartRoutes([line(1)], { 'GET /universal-cart/budget': { ok: true, monthly_cap_cents: 10000, spent_this_month_cents: 7000, cart_active_subtotal_cents: 1500, currency: 'eur', status: 'near' } });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('budget-meter')).toBeTruthy();
    expect(screen.getByTestId('budget-status-near')).toHaveTextContent('Almost at budget');
    expect(screen.getByTestId('budget-spent')).toHaveTextContent('€85.00 of €100.00 this month');
    expect(screen.getByTestId('budget-advisory')).toHaveTextContent('These items bring you close to your monthly budget.');
  });

  it('over: the destructive pill and the over advisory', async () => {
    const { routes } = cartRoutes([line(1)], { 'GET /universal-cart/budget': { ok: true, monthly_cap_cents: 1000, spent_this_month_cents: 900, cart_active_subtotal_cents: 1500, currency: 'EUR', status: 'over' } });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('budget-status-over')).toBeTruthy();
    expect(screen.getByTestId('budget-advisory')).toHaveTextContent('These items push you over your monthly budget.');
  });

  it('no cap: the hint and the Budget link to /settings/limitations, no advisory', async () => {
    const { routes } = cartRoutes([line(1)]);
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('budget-settings'));
    expect(router.navigate).toHaveBeenCalledWith('/settings/limitations');
    expect(screen.queryByTestId('budget-advisory')).toBeNull();
  });
});

describe('/universal-cart — checkout (idempotency preserved)', () => {
  it('a retry of the same cart reuses the key; changed contents get a new key; a landed checkout clears it', async () => {
    let attempt = 0;
    const { routes } = cartRoutes([line(1)], {
      'POST /universal-cart/checkout': () => {
        attempt += 1;
        if (attempt <= 2) return status(500, { ok: false, error: 'WALLET_DEBIT_FAILED' });
        return { ok: true, checkout_id: 'chk-1', wallet_order: { currency: 'EUR', amount_minor: 3000, balance_minor: 0, duplicate: false, order_ids: ['o1'] }, affiliate_redirects: [], completed_item_ids: ['line-1'] };
      },
    });
    const mintKey = mint();
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mintKey} />, { wrapper });
    const checkoutBodies = () => requests.filter((r) => r.path === '/universal-cart/checkout').map((r) => r.body.idempotency_key);

    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    expect(titles()).toEqual(['marketplaceCheckout.errors.WALLET_DEBIT_FAILED']);
    await act(async () => {
      fireEvent.press(screen.getByTestId('cart-checkout'));
    });
    // same cart → the same key (a retry is a retry: the gateway rejects the replayed debit)
    expect(checkoutBodies()).toEqual(['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001']);

    // contents change → a new key
    await act(async () => {
      fireEvent.press(screen.getByTestId('qty-inc-line-1'));
    });
    await waitFor(() => expect(screen.getByTestId('qty-value-line-1')).toHaveTextContent('2'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('cart-checkout'));
    });
    expect(checkoutBodies()[2]).toBe('00000000-0000-4000-8000-000000000002');
    expect(titles()).toContain('marketplaceCheckout.checkout.successTitle');
    expect(__toastsForTests().find((t) => t.titleKey === 'marketplaceCheckout.checkout.successTitle')?.descKey).toBe('marketplaceCheckout.checkout.successBody');
    expect(router.navigate).toHaveBeenCalledWith('/checkout/success?checkout_id=chk-1');

    // the key was spent: the next checkout is a new purchase
    await act(async () => {
      fireEvent.press(screen.getByTestId('cart-checkout'));
    });
    expect(checkoutBodies()[3]).toBe('00000000-0000-4000-8000-000000000003');
    expect(mintKey).toHaveBeenCalledTimes(3);
    const post = requests.find((r) => r.path === '/universal-cart/checkout');
    expect(post?.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community', 'content-type': 'application/json' });
  });

  it('a replayed order (duplicate: true): the duplicate toast, then /checkout/success', async () => {
    const { routes } = cartRoutes([line(1)], {
      'POST /universal-cart/checkout': { ok: true, checkout_id: 'chk-2', wallet_order: { currency: 'EUR', amount_minor: 1500, balance_minor: 0, duplicate: true, order_ids: [] }, affiliate_redirects: [], completed_item_ids: [] },
    });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mint()} />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    expect(titles()).toEqual(['marketplaceCheckout.checkout.duplicateTitle']);
    expect(router.navigate).toHaveBeenCalledWith('/checkout/success?checkout_id=chk-2');
  });

  it('affiliate redirects: each merchant link opens, the panel lists them, no wallet leg → no navigation', async () => {
    const { routes } = cartRoutes([line(1), line(2)], {
      'POST /universal-cart/checkout': {
        ok: true,
        checkout_id: 'chk-3',
        wallet_order: null,
        affiliate_redirects: [
          { item_id: 'line-1', product_id: UUID(1), affiliate_url: 'https://merchant.example.org/1', order_id: null },
          { item_id: 'line-2', product_id: UUID(2), affiliate_url: 'https://merchant.example.org/2', order_id: null },
        ],
        completed_item_ids: [],
      },
    });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mint()} />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    expect(openURL.mock.calls.map((c) => c[0])).toEqual(['https://merchant.example.org/1', 'https://merchant.example.org/2']);
    expect(titles()).toEqual(['marketplaceCheckout.checkout.affiliateOpened']);
    expect(router.navigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('affiliate-line-2'));
    expect(openURL).toHaveBeenLastCalledWith('https://merchant.example.org/2');
  });

  it('an unknown error code → the generic checkout message', async () => {
    const { routes } = cartRoutes([line(1)], { 'POST /universal-cart/checkout': status(500, { ok: false, error: 'SOMETHING_NEW' }) });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mint()} />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    expect(titles()).toEqual(['marketplaceCheckout.errors.unknown']);
  });

  it('checkoutErrorKey maps the 15 web codes and nothing else', () => {
    expect(CHECKOUT_ERROR_KEYS.size).toBe(15);
    expect(checkoutErrorKey('CART_EMPTY')).toBe('marketplaceCheckout.errors.CART_EMPTY');
    expect(checkoutErrorKey('nope')).toBe('marketplaceCheckout.errors.unknown');
    expect(checkoutErrorKey(undefined)).toBe('marketplaceCheckout.errors.unknown');
  });

  it('the default key minter is expo-crypto randomUUID (the gateway validates a UUID)', () => {
    (randomUUID as jest.Mock).mockReturnValueOnce('11111111-1111-4111-8111-111111111111');
    expect(mintCheckoutKey()).toBe('11111111-1111-4111-8111-111111111111');
  });
});

describe('/universal-cart — insufficient balance → AddMoneyDialog', () => {
  const insufficient = { 'POST /universal-cart/checkout': status(402, { ok: false, error: 'INSUFFICIENT_BALANCE', balance_minor: 500, required_minor: 1990, currency: 'USD' }) };

  it('402 opens the dialog prefilled with the missing amount and currency; Continue creates the deposit and opens Stripe', async () => {
    const { routes } = cartRoutes([line(1)], {
      ...insufficient,
      'POST /wallet/deposits/create': { ok: true, deposit_id: 'dep-1', checkout_url: 'https://checkout.stripe.g1-test.example.org/s/1', expires_at: '' },
    });
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mint()} />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    expect(titles()).toEqual(['marketplaceCheckout.errors.INSUFFICIENT_BALANCE']);
    const dialog = await screen.findByTestId('add-money-dialog-content');
    expect(within(dialog).getByText('Add money')).toBeTruthy();
    expect(screen.getByTestId('add-money-amount').props.value).toBe('14.9');
    expect(screen.getByTestId('add-money-currency')).toHaveTextContent('USD');
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-money-continue'));
    });
    expect(requests.find((r) => r.path === '/wallet/deposits/create')).toMatchObject({ method: 'POST', body: { amount_minor: 1490, currency: 'USD' } });
    expect(requests.find((r) => r.path === '/wallet/deposits/create')?.headers).toMatchObject({ 'x-vitana-active-role': 'community', 'content-type': 'application/json' });
    await waitFor(() => expect(openBrowser).toHaveBeenCalledWith('https://checkout.stripe.g1-test.example.org/s/1'));
    expect(titles()).not.toContain('marketplaceCheckout.addMoney.failed');
  });

  it('an invalid amount toasts and creates nothing; a failing create toasts "failed"', async () => {
    const { routes } = cartRoutes([line(1)], { ...insufficient, 'POST /wallet/deposits/create': FAIL });
    const { wrapper, requests } = discoverWrapper(routes);
    render(<UniversalCartScreen mintKey={mint()} />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('cart-checkout'));
    });
    await screen.findByTestId('add-money-dialog-content');
    fireEvent.changeText(screen.getByTestId('add-money-amount'), '0');
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-money-continue'));
    });
    expect(titles()).toContain('marketplaceCheckout.addMoney.invalidAmount');
    expect(requests.filter((r) => r.path === '/wallet/deposits/create')).toEqual([]);
    fireEvent.changeText(screen.getByTestId('add-money-amount'), '12,50');
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-money-continue'));
    });
    expect(requests.find((r) => r.path === '/wallet/deposits/create')?.body).toEqual({ amount_minor: 1250, currency: 'USD' });
    expect(titles()).toContain('marketplaceCheckout.addMoney.failed');
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it('the wallet card\'s "Add money" opens the dialog unprefilled (EUR, empty)', async () => {
    const { routes } = cartRoutes([line(1)]);
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('wallet-add-money'));
    expect(await screen.findByTestId('add-money-dialog-content')).toBeTruthy();
    expect(screen.getByTestId('add-money-amount').props.value).toBe('');
    expect(screen.getByTestId('add-money-currency')).toHaveTextContent('EUR');
  });

  it('no wallet accounts: "No balance yet"', async () => {
    const { routes } = cartRoutes([line(1)], { 'GET /wallet/balance': { ok: true, accounts: [] } });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    expect(await screen.findByTestId('wallet-balance-empty')).toBeTruthy();
  });
});

describe('/universal-cart — Vitana (shopping agent)', () => {
  it('an empty prompt sends nothing; a prompt POSTs /shopping-agent/propose and the refetched cart shows the proposals', async () => {
    const agentLine = line(3, { metadata: { origin: 'agent', title: 'Agent Pick', rationale: 'Supports sleep', safety_flags: ['Check with your doctor'], confidence: 0.82 } });
    const state = cartRoutes([line(1)], {
      'POST /shopping-agent/propose': () => {
        state.set([line(1), agentLine]);
        return { ok: true, run_id: 'r1', proposed: [], advisory: [] };
      },
    });
    const { wrapper, requests } = discoverWrapper(state.routes);
    render(<UniversalCartScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('agent-propose'));
    });
    expect(requests.filter((r) => r.path.startsWith('/shopping-agent'))).toEqual([]);
    fireEvent.changeText(screen.getByTestId('agent-prompt'), '  better sleep  ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('agent-propose'));
    });
    const post = requests.find((r) => r.path === '/shopping-agent/propose');
    expect(post).toMatchObject({ method: 'POST', body: { prompt: 'better sleep' } });
    expect(post?.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community' });
    expect(await screen.findByTestId('agent-section')).toBeTruthy();
    expect(screen.getByTestId('agent-review-note')).toBeTruthy();
    expect(screen.getByText('Agent Pick')).toBeTruthy();
    expect(screen.getByText('Supports sleep')).toBeTruthy();
    expect(screen.getByTestId('agent-safety-line-3')).toHaveTextContent(/Check with your doctor/);
    expect(screen.getByTestId('agent-confidence-line-3')).toHaveTextContent('Confidence: 82%');
    expect(screen.getByTestId('agent-prompt').props.value).toBe('');
    // the agent line is not in the buyable list
    expect(screen.queryByTestId('cart-line-line-3')).toBeNull();
    fireEvent.press(screen.getByTestId('agent-keep-line-3'));
    expect(screen.getByTestId('agent-keep-line-3')).toBeDisabled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('agent-remove-line-3'));
    });
    expect(requests.find((r) => r.method === 'DELETE')?.path).toBe('/universal-cart/items/line-3');
  });

  it('Buy again POSTs /shopping-agent/reorder and renders the reorder section with its badge', async () => {
    const reorderLine = line(4, { metadata: { origin: 'reorder', source_label: 'Old favourite' } });
    const state = cartRoutes([line(1)], {
      'POST /shopping-agent/reorder': () => {
        state.set([line(1), reorderLine]);
        return { ok: true, run_id: 'r2', proposed: [], advisory: [] };
      },
    });
    const { wrapper, requests } = discoverWrapper(state.routes);
    render(<UniversalCartScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId('agent-reorder'));
    });
    expect(requests.find((r) => r.path === '/shopping-agent/reorder')).toMatchObject({ method: 'POST', body: {} });
    expect(await screen.findByTestId('reorder-section')).toBeTruthy();
    expect(screen.getByTestId('reorder-badge-line-4')).toHaveTextContent('Bought before');
    expect(screen.getByText('Old favourite')).toBeTruthy();
  });

  it.each([
    ['403 role', status(403, { ok: false, error: 'cart_unavailable_for_role', role: null }), 'agent-role-blocked'],
    ['502 llm_unavailable', status(502, { ok: false, error: 'llm_unavailable' }), 'agent-unavailable'],
    ['500', FAIL, 'agent-error'],
  ])('a failing propose (%s) shows its alert', async (_label, answer, testID) => {
    const { routes } = cartRoutes([line(1)], { 'POST /shopping-agent/propose': answer });
    const { wrapper } = discoverWrapper(routes);
    render(<UniversalCartScreen />, { wrapper });
    fireEvent.changeText(await screen.findByTestId('agent-prompt'), 'energy');
    await act(async () => {
      fireEvent.press(screen.getByTestId('agent-propose'));
    });
    expect(await screen.findByTestId(testID)).toBeTruthy();
    for (const other of ['agent-role-blocked', 'agent-unavailable', 'agent-error'].filter((x) => x !== testID)) expect(screen.queryByTestId(other)).toBeNull();
  });
});
