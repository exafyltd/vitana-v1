/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/discover/product/:id` (web src/pages/discover/ProductDetail.tsx, phone
 * branch): loading, not found (404) and error, the loaded page with every
 * section, the shared AddToCartButton (consumed through the port, its gate
 * and POST), the affiliate Buy redirect (`product_detail` + the remembered
 * `?rec=`), and Back / Discover more. Fake gateway only.
 */
import '../helpers/no-network';
import { router, searchParams } from './discover-mocks';
import './timing';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import * as commercePort from '../../src/ports/commerce';
import * as cartPort from '../../src/ports/add-to-cart';
import { ProductDetailScreen } from '../../src/screens/commerce/ProductDetailScreen';
import { __clearRecommendationIdsForTests } from '../../src/screens/commerce/data/product';
import { gatewayOrigin } from '../../src/screens/discover/data/client';
import { budget, discoverWrapper, emptyCart, FAIL, product, status, UUID } from './discover-helpers';

jest.setTimeout(30000);

const openURL = jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
  __clearRecommendationIdsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const ID = UUID(5);
const full = product(5, {
  title: 'Omega Pro',
  brand: 'Nordic',
  price_cents: 1990,
  compare_at_price_cents: 2490,
  availability: 'out_of_stock',
  origin_country: 'Norway',
  rating: 4.6,
  review_count: 1234,
  reward_preview: { points_estimate: 40 },
  description: 'Short',
  description_long: 'Long description',
  ingredients_primary: ['fish_oil', 'vitamin_e'],
  health_goals: ['heart_health'],
  dietary_tags: ['gluten_free'],
  dosage: '2 caps',
  serving_size: '2 softgels',
  servings_per_container: 30,
  safety_notes: 'Ask your doctor',
  evidence_links: [{ title: 'Study A', url: 'https://example.org/a', source_type: 'meta_analysis' }, { title: 'No url' }],
  match_reasons: [{ kind: 'goal', text: 'Matches your heart goal' }, { kind: 'x', text: '' }],
});
const routes = (p: unknown = { ok: true, product: full }) => ({
  [`GET /discover/product/${ID}`]: p,
  'GET /universal-cart': emptyCart,
  'GET /universal-cart/budget': budget,
  'GET /discover/my-recommendations': { ok: true, items: [] },
  'POST /universal-cart/items': { ok: true, cart_id: 'c', item: {}, action: 'created', cart_created: true },
});

describe('/discover/product/:id — states', () => {
  it('loading: the pulse blocks while the product loads', async () => {
    searchParams.current = { id: ID };
    const { wrapper } = discoverWrapper(routes());
    render(<ProductDetailScreen />, { wrapper });
    expect(screen.getByTestId('product-detail-loading')).toBeTruthy();
    expect(await screen.findByTestId('product-detail')).toBeTruthy();
  });

  it('404: "Product not found" with Go back and Discover more (not an error)', async () => {
    searchParams.current = { id: ID };
    const { wrapper, requests } = discoverWrapper({ ...routes(), [`GET /discover/product/${ID}`]: status(404, { ok: false }) });
    render(<ProductDetailScreen />, { wrapper });
    expect(await screen.findByText('Product not found')).toBeTruthy();
    expect(screen.getByText("The product you're looking for is unavailable or has been removed.")).toBeTruthy();
    expect(requests.filter((r) => r.path === `/discover/product/${ID}`)).toHaveLength(1);
    fireEvent.press(screen.getByTestId('product-go-back'));
    expect(router.back).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('product-discover-more'));
    expect(router.navigate).toHaveBeenCalledWith('/discover');
  });

  it('a failing request (500) renders the same not-found state', async () => {
    searchParams.current = { id: ID };
    const { wrapper } = discoverWrapper({ ...routes(), [`GET /discover/product/${ID}`]: FAIL });
    render(<ProductDetailScreen />, { wrapper });
    expect(await screen.findByTestId('product-not-found')).toBeTruthy();
  });

  it('Go back on a cold start (no history) opens /discover', async () => {
    searchParams.current = { id: ID };
    router.canGoBack.mockReturnValueOnce(false);
    const { wrapper } = discoverWrapper({ ...routes(), [`GET /discover/product/${ID}`]: status(404, {}) });
    render(<ProductDetailScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('product-go-back'));
    expect(router.back).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith('/discover');
  });
});

describe('/discover/product/:id — loaded', () => {
  it('renders every web section of the phone branch, in order', async () => {
    searchParams.current = { id: ID };
    const { wrapper, requests } = discoverWrapper(routes());
    render(<ProductDetailScreen />, { wrapper });
    expect(await screen.findByTestId('product-detail')).toBeTruthy();
    const req = requests.find((r) => r.path === `/discover/product/${ID}`);
    expect(req?.headers['content-type']).toBe('application/json');
    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.getByText('Nordic')).toBeTruthy();
    expect(screen.getByText('Omega Pro')).toBeTruthy();
    expect(screen.getByTestId('product-availability')).toBeTruthy();
    expect(screen.getByText('Out of Stock')).toBeTruthy();
    expect(screen.getByText('4.6')).toBeTruthy();
    expect(screen.getByText(/^\(1,234 ?reviews\)$/)).toBeTruthy();
    expect(screen.getByText('Norway')).toBeTruthy();
    expect(screen.getByText('longevity')).toBeTruthy();
    expect(screen.getByTestId('product-price')).toHaveTextContent('€19.90');
    expect(screen.getByText('€24.90')).toBeTruthy();
    expect(screen.getByTestId('product-discount')).toHaveTextContent('Save 20%');
    expect(screen.getByTestId('product-reward')).toHaveTextContent(/Earn \+40 ?points on purchase/);
    expect(screen.getByTestId(`add-to-cart-${ID}`)).toBeTruthy();
    expect(screen.getByTestId('product-buy')).toBeTruthy();
    expect(screen.getByTestId(`recommend-cta-${ID}`)).toBeTruthy();
    expect(screen.getByTestId(`bookmark-product-${ID}`)).toBeTruthy();
    expect(screen.getByTestId('product-send-in-message')).toBeTruthy();
    expect(screen.getByTestId('product-share')).toBeTruthy();
    expect(screen.getByTestId('product-about')).toHaveTextContent(/Long description/);
    expect(screen.getByText('fish oil')).toBeTruthy();
    expect(screen.getByText('vitamin e')).toBeTruthy();
    expect(screen.getByTestId('product-safety')).toHaveTextContent(/Ask your doctor/);
    expect(screen.getByTestId('product-evidence-0')).toHaveTextContent('Study A');
    expect(screen.queryByText('No url')).toBeNull();
    expect(screen.getByText('meta analysis')).toBeTruthy();
    expect(screen.getByTestId('product-directions')).toHaveTextContent(/2 caps.*2 softgels.*30/);
    expect(screen.getByText('heart health')).toBeTruthy();
    expect(screen.getByText('gluten free')).toBeTruthy();
    expect(screen.getByTestId('product-why')).toHaveTextContent(/Matches your heart goal/);
    // the order of the web sections
    const ids = screen.UNSAFE_root.findAll((n) => typeof n.props?.testID === 'string' && /^product-(about|ingredients|safety|evidence|directions|supports|dietary|why)$/.test(n.props.testID) && typeof n.type !== 'string').map((n) => n.props.testID);
    expect([...new Set(ids)]).toEqual(['product-about', 'product-ingredients', 'product-safety', 'product-evidence', 'product-directions', 'product-supports', 'product-dietary', 'product-why']);
    fireEvent.press(screen.getByTestId('product-evidence-0'));
    expect(openURL).toHaveBeenCalledWith('https://example.org/a');
  });

  it('Buy opens the tracked affiliate redirect with surface product_detail and the remembered ?rec= id', async () => {
    searchParams.current = { id: ID, rec: 'rec-9' };
    const { wrapper } = discoverWrapper(routes());
    const first = render(<ProductDetailScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('product-buy'));
    expect(openURL).toHaveBeenLastCalledWith(`${gatewayOrigin()}/r/${ID}?surface=product_detail&rec_id=rec-9`);
    first.unmount();
    // the same session, opened again without ?rec=: the remembered id is still carried
    searchParams.current = { id: ID };
    render(<ProductDetailScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('product-buy'));
    expect(openURL).toHaveBeenLastCalledWith(`${gatewayOrigin()}/r/${ID}?surface=product_detail&rec_id=rec-9`);
  });

  it('Buy without a recommendation id: no rec_id', async () => {
    searchParams.current = { id: ID };
    const { wrapper } = discoverWrapper(routes());
    render(<ProductDetailScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('product-buy'));
    expect(openURL).toHaveBeenCalledWith(`${gatewayOrigin()}/r/${ID}?surface=product_detail`);
  });

  it('Add to cart: the shared twin posts the web body (signed in)', async () => {
    searchParams.current = { id: ID };
    const { wrapper, requests } = discoverWrapper(routes());
    render(<ProductDetailScreen />, { wrapper });
    await screen.findByTestId('product-detail');
    await waitFor(() => expect(requests.some((r) => r.path === '/universal-cart')).toBe(true));
    await act(async () => {
      fireEvent.press(screen.getByTestId(`add-to-cart-${ID}`));
    });
    expect(requests.find((r) => r.method === 'POST' && r.path === '/universal-cart/items')?.body).toMatchObject({ product_id: ID, item_type: 'partner_product', quantity: 1, unit_price_cents_snapshot: 1990, metadata: { source_label: 'Omega Pro' } });
    expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['universalCart.addButton.success']);
  });

  it('Add to cart signed out: the sign-in toast, no cart request (the twin\'s gate)', async () => {
    searchParams.current = { id: ID };
    const { wrapper, requests } = discoverWrapper(routes(), { signedIn: false });
    render(<ProductDetailScreen />, { wrapper });
    await act(async () => {
      fireEvent.press(await screen.findByTestId(`add-to-cart-${ID}`));
    });
    expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['toasts.cart.signRequired']);
    expect(requests.filter((r) => r.path.startsWith('/universal-cart'))).toEqual([]);
    expect(screen.queryByTestId('product-send-in-message')).toBeNull();
  });

  it('a minimal product renders only the sections it has data for, in-stock has no badge, no discount', async () => {
    searchParams.current = { id: ID };
    const { wrapper } = discoverWrapper(routes({ ok: true, product: product(5, { description: null }) }));
    render(<ProductDetailScreen />, { wrapper });
    expect(await screen.findByTestId('product-detail')).toBeTruthy();
    for (const id of ['product-availability', 'product-discount', 'product-reward', 'product-about', 'product-ingredients', 'product-safety', 'product-evidence', 'product-directions', 'product-supports', 'product-dietary', 'product-why']) {
      expect({ id, found: screen.queryByTestId(id) }).toEqual({ id, found: null });
    }
    expect(screen.getByText(/This product card is for informational purposes only/)).toBeTruthy();
  });
});

describe('the AddToCartButton is consumed through the port, not re-owned', () => {
  it('src/ports/commerce re-exports the discover twin from src/ports/add-to-cart', () => {
    expect(commercePort.AddToCartButton).toBe(cartPort.AddToCartButton);
    expect(commercePort.useUniversalCart).toBe(cartPort.useUniversalCart);
  });
});
