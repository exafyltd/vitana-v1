/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the shared
 * AddToCartButton twin (web src/components/cart/AddToCartButton.tsx): the
 * signed-out gate, the role block, the product-only UUID rule, the built
 * `POST /universal-cart/items` request and its headers, the "In cart" state,
 * and the port the product-cart-checkout lane consumes it through.
 */
import '../helpers/no-network';
import { router } from './discover-mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import * as port from '../../src/ports/add-to-cart';
import { AddToCartButton } from '../../src/screens/discover/AddToCartButton';
import { MobileDiscoverView } from '../../src/screens/discover/MobileDiscoverView';
import { budget, discoverWrapper, emptyCart, status, TOKEN, UUID } from './discover-helpers';

afterEach(() => {
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const item = { item_type: 'product' as const, item_id: UUID(7), item_name: 'Omega Pro', item_price: 19.9, item_metadata: { brand: 'B' } };
const titles = () => __toastsForTests().map((t) => t.titleKey);

describe('AddToCartButton — gate states', () => {
  it('signed out: "sign in required" toast, back to /, no cart request', async () => {
    const { wrapper, requests } = discoverWrapper({}, { signedIn: false });
    render(<AddToCartButton item={item} />, { wrapper });
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${item.item_id}`));
    });
    expect(titles()).toEqual(['toasts.cart.signRequired']);
    expect(__toastsForTests()[0].descKey).toBe('toasts.cart.pleaseSignAddItemsYourCart');
    expect(router.navigate).toHaveBeenCalledWith('/');
    expect(requests.filter((r) => r.path.startsWith('/universal-cart'))).toEqual([]);
  });

  it('role-blocked cart (403 cart_unavailable_for_role): the role toast, no POST', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': status(403, { ok: false, error: 'cart_unavailable_for_role', role: 'professional' }), 'GET /universal-cart/budget': budget });
    render(<AddToCartButton item={item} />, { wrapper });
    await waitFor(() => expect(requests.some((r) => r.path === '/universal-cart')).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${item.item_id}`));
    });
    expect(titles()).toEqual(['universalCart.addButton.roleBlocked']);
    expect(requests.filter((r) => r.method === 'POST')).toEqual([]);
  });

  it.each([
    ['a wellness_service item', { ...item, item_type: 'wellness_service' as const }],
    ['a non-UUID product id', { ...item, item_id: '42' }],
  ])('%s never enters the cart: the "failed" toast, no POST', async (_label, it2) => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget });
    render(<AddToCartButton item={it2} />, { wrapper });
    await waitFor(() => expect(requests.some((r) => r.path === '/universal-cart')).toBe(true));
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${it2.item_id}`));
    });
    expect(titles()).toEqual(['universalCart.addButton.failed']);
    expect(requests.filter((r) => r.method === 'POST')).toEqual([]);
  });

  it('a product: POST /universal-cart/items with the web body and headers, the success toast, then "In cart"', async () => {
    let cart: unknown = emptyCart;
    const { wrapper, requests } = discoverWrapper({
      'GET /universal-cart': () => cart,
      'GET /universal-cart/budget': budget,
      'POST /universal-cart/items': () => {
        cart = { ok: true, cart: { id: 'c1' }, items: [{ id: 'i1', product_id: item.item_id, status: 'active', quantity: 1, metadata: {} }] };
        return { ok: true, cart_id: 'c1', item: {}, action: 'created', cart_created: true };
      },
    });
    render(<AddToCartButton item={item} />, { wrapper });
    await waitFor(() => expect(requests.some((r) => r.path === '/universal-cart')).toBe(true));
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${item.item_id}`));
    });
    const post = requests.find((r) => r.method === 'POST');
    expect(post).toMatchObject({
      path: '/universal-cart/items',
      body: { product_id: item.item_id, item_type: 'partner_product', quantity: 1, unit_price_cents_snapshot: 1990, source_surface: 'community', metadata: { source_label: 'Omega Pro' } },
    });
    expect(post?.headers).toMatchObject({ authorization: `Bearer ${TOKEN}`, 'x-vitana-active-role': 'community', 'content-type': 'application/json' });
    expect(titles()).toEqual(['universalCart.addButton.success']);
    expect(screen.getByTestId('add-to-cart-added', { includeHiddenElements: true })).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('In Cart')).toBeTruthy());
  });

  it('a failing POST: the "failed" toast', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /universal-cart': emptyCart, 'GET /universal-cart/budget': budget, 'POST /universal-cart/items': status(500, { ok: false, error: 'boom' }) });
    render(<AddToCartButton item={item} />, { wrapper });
    await waitFor(() => expect(requests.some((r) => r.path === '/universal-cart')).toBe(true));
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${item.item_id}`));
    });
    expect(titles()).toEqual(['universalCart.addButton.failed']);
  });
});

describe('the shared twins port (plan decision 3)', () => {
  it('src/ports/add-to-cart.ts exports the one AddToCartButton, the cart hook and MobileDiscoverView', () => {
    expect(port.AddToCartButton).toBe(AddToCartButton);
    expect(port.MobileDiscoverView).toBe(MobileDiscoverView);
    expect(typeof port.useUniversalCart).toBe('function');
    expect(port.universalCartQueryKeys.cart()).toEqual(['universal-cart', 'cart']);
  });
});
