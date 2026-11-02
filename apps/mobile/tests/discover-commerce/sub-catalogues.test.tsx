/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — the sub-catalogues:
 * supplements (search params from the filters, `?category=`, grid → product
 * drawer → add to cart, Top Picks, My Stack), wellness services (categories,
 * the category sheet, bookmarks), deals & offers (flash filter, the `tab`
 * param, the sample tabs, quick shop actions) and the
 * `/discover/category/:subcategory` list (request, rows, empty, back). Every
 * add-to-cart surface renders the shared twin.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { SupplementsScreen, supplementSearchParams } from '../../src/screens/discover/SupplementsScreen';
import { WellnessServicesScreen } from '../../src/screens/discover/WellnessServicesScreen';
import { DealsOffersScreen, toFlashDeals } from '../../src/screens/discover/DealsOffersScreen';
import { CategoryProductsScreen } from '../../src/screens/discover/CategoryProductsScreen';
import { searchQueryString } from '../../src/screens/discover/data/marketplace';
import { budget, discoverWrapper, emptyCart, product, searchResult, UUID } from './helpers';

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const common = {
  'GET /universal-cart': emptyCart,
  'GET /universal-cart/budget': budget,
  'GET /discover/my-recommendations': { ok: true, items: [] },
  'POST /universal-cart/items': { ok: true, cart_id: 'c', item: {}, action: 'created', cart_created: true },
};

describe('/discover/supplements', () => {
  it('builds the web search: category=supplements, q, subcategory, sort map, limit 48', () => {
    expect(searchQueryString(supplementSearchParams('', 'all', 'popular'))).toBe('category=supplements&sort=relevance&limit=48');
    expect(searchQueryString(supplementSearchParams('omega', 'essential-fatty-acids', 'price-high'))).toBe('q=omega&category=supplements&subcategory=essential-fatty-acids&sort=price_desc&limit=48');
  });

  it('loads the grid from ?category=, changes sort, opens the product drawer and adds to cart', async () => {
    searchParams.current = { category: 'minerals' };
    const items = [product(1, { health_goals: ['sleep', 'focus', 'energy'] }), product(2, { availability: 'out_of_stock' })];
    const { wrapper, requests } = discoverWrapper({ ...common, 'GET /discover/search': searchResult(items, { allergies: 2, contraindications: 0, medications: 0, dietary: 0, budget: 1, sensitivities: 0, geo: 0, excluded_region: 0 }) });
    render(<SupplementsScreen />, { wrapper });
    expect(await screen.findByTestId(`supplement-card-${UUID(1)}`)).toBeTruthy();
    expect(requests.find((r) => r.path === '/discover/search')?.query.toString()).toBe('category=supplements&subcategory=minerals&sort=relevance&limit=48');
    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByText('$19.91')).toBeTruthy();
    // hidden-by-preferences footer
    fireEvent.press(screen.getByTestId('hidden-by-limitations-toggle'));
    fireEvent.press(screen.getByTestId('hidden-adjust-allergies'));
    // the web Link goes to /settings/limitations#allergies; the native resolver drops the fragment
    expect(router.navigate).toHaveBeenCalledWith('/settings/limitations');
    // sort select
    fireEvent.press(screen.getByTestId('supplements-sort'));
    fireEvent.press(await screen.findByTestId('supplements-sort-price-low'));
    await waitFor(() => expect(requests.some((r) => r.query.get('sort') === 'price_asc')).toBe(true));
    // card → product drawer → add to cart
    fireEvent.press(await screen.findByTestId(`supplement-card-${UUID(1)}`));
    const drawer = await screen.findByTestId('product-details');
    await act(async () => {
      fireEvent.press(within(drawer).getByTestId(`add-to-cart-${UUID(1)}`));
    });
    expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({ product_id: UUID(1), unit_price_cents_snapshot: 1991, source_surface: 'community' });
  });

  it('loading → empty; Top Picks; My Stack empty and with a bookmarked supplement', async () => {
    const { wrapper } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([]) });
    const r1 = render(<SupplementsScreen />, { wrapper });
    expect(screen.getByTestId('supplements-loading')).toBeTruthy();
    expect(await screen.findByTestId('supplements-empty')).toBeTruthy();
    fireEvent.press(screen.getByTestId('discover-tab-stack'));
    expect(await screen.findByTestId('supplements-stack-empty')).toBeTruthy();
    r1.unmount();
    const b = discoverWrapper({ ...common, 'GET /discover/search': searchResult([product(1), product(2)]) }, { tables: { bookmarked_items: [{ id: 'b1', user_id: 'u-1', item_type: 'supplement', item_id: UUID(2), item_name: 'Product 2' }] } });
    render(<SupplementsScreen />, { wrapper: b.wrapper });
    await screen.findByTestId(`supplement-card-${UUID(1)}`);
    fireEvent.press(screen.getByTestId('discover-tab-picks'));
    expect(screen.getByText('95%')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    fireEvent.press(screen.getByTestId('discover-tab-stack'));
    await waitFor(() => expect(screen.getByTestId('supplements-stack')).toBeTruthy());
    expect(screen.getByTestId(`supplement-card-${UUID(2)}`)).toBeTruthy();
    expect(screen.queryByTestId(`supplement-card-${UUID(1)}`)).toBeNull();
  });

  it('bookmark toggles the bookmarked_items row; + Action opens the quick shop actions', async () => {
    const { wrapper, db } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([product(1)]) });
    render(<SupplementsScreen />, { wrapper });
    await screen.findByTestId(`supplement-card-${UUID(1)}`);
    await act(async () => {
      fireEvent.press(screen.getByTestId(`bookmark-supplement-${UUID(1)}`));
    });
    const insert = db.ops.find((o) => o.table === 'bookmarked_items' && o.op === 'insert');
    expect(insert?.values).toMatchObject({ user_id: 'u-1', item_type: 'supplement', item_id: UUID(1), item_name: 'Product 1' });
    fireEvent.press(screen.getByTestId('discover-action-button'));
    fireEvent.press(await screen.findByTestId('quick-action-viewCart'));
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.discover.actionSelected');
  });
});

describe('/discover/wellness-services', () => {
  it('categories → the category sheet with its services and add to cart (wellness items never enter the cart)', async () => {
    const { wrapper, requests } = discoverWrapper(common);
    render(<WellnessServicesScreen />, { wrapper });
    expect(screen.getAllByTestId(/^wellness-category-\d$/)).toHaveLength(8);
    fireEvent.press(screen.getByTestId('wellness-explore-2'));
    expect(await screen.findByTestId('wellness-service-WS-203')).toBeTruthy();
    expect(screen.getByText('Strength Building Program')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('add-to-cart-WS-203'));
    });
    expect(__toastsForTests().map((t) => t.titleKey)).toEqual(['universalCart.addButton.failed']);
    expect(requests.filter((r) => r.method === 'POST')).toEqual([]);
  });

  it('Recommended lists six; Bookmarked: empty → back to categories, then a bookmarked category with remove', async () => {
    const a = discoverWrapper(common);
    const r1 = render(<WellnessServicesScreen />, { wrapper: a.wrapper });
    fireEvent.press(screen.getByTestId('discover-tab-recommended'));
    expect(screen.getAllByTestId(/^wellness-recommended-\d$/)).toHaveLength(6);
    fireEvent.press(screen.getByTestId('discover-tab-bookmarked'));
    fireEvent.press(await screen.findByTestId('wellness-bookmarks-explore'));
    expect(screen.getByTestId('wellness-categories')).toBeTruthy();
    r1.unmount();
    const b = discoverWrapper(common, { tables: { bookmarked_items: [{ id: 'b1', user_id: 'u-1', item_type: 'wellness_service', item_id: '3', item_name: 'Mental Wellness', item_metadata: { description: 'Mind' } }] } });
    render(<WellnessServicesScreen />, { wrapper: b.wrapper });
    fireEvent.press(screen.getByTestId('discover-tab-bookmarked'));
    fireEvent.press(await screen.findByTestId('wellness-unbookmark-3'));
    await waitFor(() => expect(b.db.ops.some((o) => o.table === 'bookmarked_items' && o.op === 'delete')).toBe(true));
    const del = b.db.ops.find((o) => o.op === 'delete');
    expect(del?.filters).toEqual([
      ['eq', 'user_id', 'u-1'],
      ['eq', 'item_type', 'wellness_service'],
      ['eq', 'item_id', '3'],
    ]);
  });
});

describe('/discover/deals-offers', () => {
  it('flash deals keep only discounted products; a card opens the product drawer', async () => {
    const items = [product(1, { price_cents: 800, compare_at_price_cents: 1000 }), product(2)];
    expect(toFlashDeals(items as never).map((d) => [d.id, d.discount])).toEqual([[UUID(1), 20]]);
    const { wrapper, requests } = discoverWrapper({ ...common, 'GET /discover/search': searchResult(items) });
    render(<DealsOffersScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId(`deal-view-${UUID(1)}`));
    expect(await screen.findByTestId('product-details')).toBeTruthy();
    expect(screen.queryByTestId(`deal-${UUID(2)}`)).toBeNull();
    expect(requests.find((r) => r.path === '/discover/search')?.query.toString()).toBe('sort=relevance&limit=48');
  });

  it('no discount: the empty flash card', async () => {
    const { wrapper } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([product(2)]) });
    render(<DealsOffersScreen />, { wrapper });
    expect(await screen.findByTestId('deals-flash-empty')).toBeTruthy();
  });

  it.each([
    ['trending', 'deals-trending'],
    ['ai', 'deals-ai'],
    ['saved', 'deals-saved'],
  ])('?tab=%s renders %s', (tab, id) => {
    searchParams.current = { tab };
    const { wrapper } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([]) });
    render(<DealsOffersScreen />, { wrapper });
    expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('a tab press writes the tab param (flash removes it)', () => {
    const { wrapper } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([]) });
    render(<DealsOffersScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('discover-tab-ai'));
    expect(router.setParams).toHaveBeenLastCalledWith({ tab: 'ai' });
    fireEvent.press(screen.getByTestId('discover-tab-flash'));
    expect(router.setParams).toHaveBeenLastCalledWith({ tab: undefined });
  });

  it('the sub-navigation moves between the Discover pages', () => {
    const { wrapper } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([]) });
    render(<DealsOffersScreen />, { wrapper });
    expect(screen.getByTestId('discover-subnav-deals-offers').props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByTestId('discover-subnav-orders'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/orders');
  });
});

describe('/discover/category/:subcategory', () => {
  it('loads the collection by its parent category and lists the rows', async () => {
    searchParams.current = { subcategory: 'hormones' };
    const { wrapper, requests } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([product(1), product(2)]) });
    render(<CategoryProductsScreen />, { wrapper });
    expect(screen.getAllByTestId('category-skeleton')).toHaveLength(6);
    expect(await screen.findByTestId(`list-row-${UUID(1)}`)).toBeTruthy();
    expect(screen.getByTestId('category-count').props.children).toBe('2 products');
    expect(requests.find((r) => r.path === '/discover/search')?.query.toString()).toBe('category=health-tests&subcategory=hormones&sort=rating&limit=50');
    fireEvent.press(screen.getByTestId(`list-row-${UUID(2)}`));
    expect(router.navigate).toHaveBeenCalledWith(`/discover/product/${UUID(2)}`);
    fireEvent.press(screen.getByTestId('category-back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('an unknown key searches supplements and shows "No results"', async () => {
    searchParams.current = { subcategory: 'mystery' };
    const { wrapper, requests } = discoverWrapper({ ...common, 'GET /discover/search': searchResult([]) });
    render(<CategoryProductsScreen />, { wrapper });
    expect(await screen.findByTestId('category-empty')).toBeTruthy();
    expect(screen.getByText('mystery')).toBeTruthy();
    expect(requests.find((r) => r.path === '/discover/search')?.query.get('category')).toBe('supplements');
  });
});
