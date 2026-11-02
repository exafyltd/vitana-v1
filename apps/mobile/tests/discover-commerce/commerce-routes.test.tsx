/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — every
 * route of the lane is reachable on a cold start: a universal link handled
 * before the navigator exists is held, replayed into Expo Router, and the real
 * route file renders (never the Unported / not-found fallback). The legacy
 * `/cart` (web src/App.tsx:1087 `<Navigate to="/universal-cart" replace>`)
 * goes through the resolver route and lands on the native universal cart,
 * query kept.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import './timing';
import { renderRouter, screen } from 'expo-router/testing-library';
import { NATIVE_ROUTES, REDIRECTS, resolveWebPath } from '../../src/navigation/resolve';
import { createLinkRouter } from '../../src/linking/link-router';
import Resolver from '../../app/(app)/[...path]';
import ProductRoute from '../../app/(app)/discover/product/[id]';
import CartRoute from '../../app/(app)/universal-cart';
import CheckoutSuccessRoute from '../../app/(app)/checkout/success';
import TicketsSuccessRoute from '../../app/(app)/tickets/success';
import PackagesSuccessRoute from '../../app/(app)/packages/success';

jest.setTimeout(30000);

// The real route files render the screens; the screens are covered by their
// own tests, so here each reports the route params it was opened with.
jest.mock('../../src/screens/commerce/ProductDetailScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return { ProductDetailScreen: () => <T>{`product id=${params().id} rec=${params().rec ?? ''}`}</T> };
});
jest.mock('../../src/screens/commerce/UniversalCartScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return { UniversalCartScreen: () => <T>{`universal-cart utm=${params().utm ?? ''}`}</T> };
});
jest.mock('../../src/screens/commerce/CheckoutSuccessScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return { CheckoutSuccessScreen: () => <T>{`checkout-success deposit=${params().deposit_id ?? ''} checkout=${params().checkout_id ?? ''}`}</T> };
});
jest.mock('../../src/screens/commerce/TicketPurchaseSuccessScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return { TicketPurchaseSuccessScreen: () => <T>{`tickets-success purchase=${params().purchase_id ?? ''}`}</T> };
});
jest.mock('../../src/screens/commerce/PackagePurchaseSuccessScreen', () => {
  const { Text: T } = jest.requireActual('react-native');
  const { useLocalSearchParams: params } = jest.requireActual('expo-router');
  return { PackagePurchaseSuccessScreen: () => <T>{`packages-success purchase=${params().purchase_id ?? ''} session=${params().session_id ?? ''}`}</T> };
});

const ROUTES = {
  '(app)/[...path]': Resolver,
  '(app)/discover/product/[id]': ProductRoute,
  '(app)/universal-cart': CartRoute,
  '(app)/checkout/success': CheckoutSuccessRoute,
  '(app)/tickets/success': TicketsSuccessRoute,
  '(app)/packages/success': PackagesSuccessRoute,
};

/** A link held before the navigator exists, then replayed — the cold-start path. */
function coldStart(url: string): string {
  const lr = createLinkRouter({ linkHosts: [], isSignedIn: () => true });
  const navigated: string[] = [];
  lr.handleLink(url);
  expect(navigated).toEqual([]);
  lr.attachNavigator((href) => navigated.push(href));
  expect(navigated).toHaveLength(1);
  return navigated[0];
}

describe('legacy /cart → /universal-cart', () => {
  it('resolves natively to the universal cart, keeping the query', () => {
    expect(REDIRECTS['/cart']).toBe('/universal-cart');
    expect(resolveWebPath('/cart')).toMatchObject({ kind: 'native', href: '/universal-cart', path: '/universal-cart' });
    expect(resolveWebPath('/cart?utm=mail')).toMatchObject({ kind: 'native', href: '/universal-cart?utm=mail' });
  });

  it('cold start: the held /cart link reaches the router, the resolver redirects, the real cart route renders', () => {
    const href = coldStart('https://vitanaland.com/cart?utm=mail');
    expect(href).toBe('/cart?utm=mail');
    renderRouter(ROUTES, { initialUrl: href });
    expect(screen.getByText('universal-cart utm=mail')).toBeTruthy();
    expect(screen.queryByTestId('unported')).toBeNull();
  });
});

describe('cold start of every lane route', () => {
  it.each([
    ['https://vitanaland.com/discover/product/00000000-0000-4000-8000-000000000005?rec=r1', 'product id=00000000-0000-4000-8000-000000000005 rec=r1'],
    ['https://vitanaland.com/universal-cart', 'universal-cart utm='],
    ['https://vitanaland.com/checkout/success?checkout_id=chk-1', 'checkout-success deposit= checkout=chk-1'],
    ['https://vitanaland.com/checkout/success?deposit_id=dep-1', 'checkout-success deposit=dep-1 checkout='],
    ['https://vitanaland.com/tickets/success?purchase_id=p-1', 'tickets-success purchase=p-1'],
    ['https://vitanaland.com/packages/success?purchase_id=pp-1&session_id=cs_1', 'packages-success purchase=pp-1 session=cs_1'],
  ])('%s opens its native route', (url, text) => {
    renderRouter(ROUTES, { initialUrl: coldStart(url) });
    expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByTestId('unported')).toBeNull();
  });

  it('the concrete routes are native in the resolver (the dynamic product route is ranked above the catch-all)', () => {
    for (const p of ['/universal-cart', '/checkout/success', '/tickets/success', '/packages/success']) {
      expect(NATIVE_ROUTES).toContain(p);
      expect(resolveWebPath(`${p}?x=1`)).toMatchObject({ kind: 'native', href: `${p}?x=1` });
    }
    expect(resolveWebPath('/discover/product/abc')).toMatchObject({ key: 'DISCOVER.PRODUCT_DETAIL', href: '/discover/product/abc' });
  });
});
