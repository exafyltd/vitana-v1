/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover`:
 * loaded / empty / error, the MobileModePill tab switch and `?tab=` deep
 * links, the guest card, every utility-rail item (search, calendar badge,
 * Life Compass, gift voucher with the iOS IAP gate, Index pill, Autopilot
 * pill), the `?m=` match toast, the page-view log and the built feed /
 * collection requests. Fake gateway + Supabase double, no network.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { overlayBus } from '../../src/navigation/overlay-bus';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { DiscoverScreen, resolveDiscoverTab, signInRoute, MATCH_GIVE_UP_MS } from '../../src/screens/discover/DiscoverScreen';
import { budget, discoverWrapper, emptyCart, feedResult, product, searchResult } from './helpers';

const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });

afterEach(() => {
  searchParams.current = {};
  jest.clearAllMocks();
  __clearToastsForTests();
  overlayBus.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const sections = (req: { query: URLSearchParams }) => {
  const cat = req.query.get('category');
  if (cat === 'supplements') return searchResult([product(10, { subcategory: 'longevity' }), product(11, { subcategory: 'adaptogens' })]);
  return searchResult([]);
};

const routes = (feed: unknown = feedResult([product(1, { match_reasons: [{ kind: 'goal', text: 'Fits your sleep goal' }] }), product(2), product(3)])) => ({
  'GET /discover/feed': feed,
  'GET /discover/search': sections,
  'GET /discover/my-recommendations': { ok: true, items: [] },
  'GET /universal-cart': emptyCart,
  'GET /universal-cart/budget': budget,
  'GET /autopilot/recommendations/count': { ok: true, count: 0 },
});

describe('/discover — loaded, empty, error', () => {
  it('loaded: the featured hero, "More to explore" and the collections, from GET /discover/feed?limit=12', async () => {
    const { wrapper, requests } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    expect(await screen.findByTestId(`featured-card-${product(1).id}`)).toBeTruthy();
    expect(screen.getByText('Fits your sleep goal')).toBeTruthy();
    expect(screen.getByTestId('discover-more-to-explore')).toBeTruthy();
    expect(screen.getByTestId(`compact-card-${product(2).id}`)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('shop-section-longevity')).toBeTruthy());
    const feed = requests.find((r) => r.path === '/discover/feed');
    expect(feed?.query.toString()).toBe('limit=12');
    expect(feed?.headers['content-type']).toBe('application/json');
    expect(feed?.headers.authorization).toBe('Bearer token-u-1');
    const searches = requests.filter((r) => r.path === '/discover/search').map((r) => r.query.toString()).sort();
    expect(searches).toEqual(['category=health-tests&sort=rating&limit=50', 'category=skincare&sort=rating&limit=50', 'category=supplements&sort=rating&limit=50']);
  });

  it('a featured card opens the product by its real id; "See all" goes to /discover/ai-picks → the Vitana Picks tab', async () => {
    const { wrapper } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId(`featured-card-${product(1).id}`));
    expect(router.navigate).toHaveBeenCalledWith(`/discover/product/${product(1).id}`);
    fireEvent.press(screen.getByTestId('discover-see-all-picks'));
    expect(router.navigate).toHaveBeenLastCalledWith('/discover?tab=suggested');
  });

  it('empty: no hero, and each collection says "No results"', async () => {
    const { wrapper } = discoverWrapper({ ...routes(feedResult([])), 'GET /discover/search': searchResult([]) });
    render(<DiscoverScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('shop-sections-empty-supplements')).toBeTruthy());
    expect(screen.queryByTestId('discover-more-to-explore')).toBeNull();
    expect(screen.queryAllByTestId(/^featured-card-/)).toHaveLength(0);
  });

  it('error: a failing feed still renders the page and the rail', async () => {
    const { wrapper } = discoverWrapper({ ...routes(), 'GET /discover/feed': undefined });
    render(<DiscoverScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('shop-section-longevity')).toBeTruthy());
    expect(screen.getByTestId('discover-utility-bar')).toBeTruthy();
    expect(screen.queryAllByTestId(/^featured-card-/)).toHaveLength(0);
  });
});

describe('/discover — mode pill and ?tab=', () => {
  it('the mode pill switches Vitana Picks → Categories → Share & Earn', async () => {
    const { wrapper } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    expect(screen.getByTestId('discover-tab-suggested')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-categories'));
    expect(screen.getByTestId('discover-tab-categories')).toBeTruthy();
    fireEvent.press(screen.getByTestId('discover-category-chip-experts'));
    expect(router.navigate).toHaveBeenCalledWith('/discover/doctors-coaches');
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-share'));
    expect(screen.getByTestId('discover-tab-share')).toBeTruthy();
    // the four non-product chips only (nutrition / supplements are collections)
    await act(async () => undefined);
  });

  it.each([
    ['suggested', 'discover-tab-suggested'],
    ['categories', 'discover-tab-categories'],
    ['share', 'discover-tab-share'],
    ['bogus', 'discover-tab-suggested'],
  ])('?tab=%s opens %s', (tab, id) => {
    searchParams.current = { tab };
    const { wrapper } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    expect(screen.getByTestId(id)).toBeTruthy();
  });

  it('resolveDiscoverTab keeps only the three pills', () => {
    expect([resolveDiscoverTab(' Categories '), resolveDiscoverTab('x'), resolveDiscoverTab(undefined)]).toEqual(['categories', null, null]);
  });
});

describe('/discover — guest card', () => {
  it('signed out: the guest card sends the visitor to the portal with ?redirectTo=', async () => {
    const { wrapper } = discoverWrapper(routes(feedResult([], true)), { signedIn: false });
    render(<DiscoverScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('discover-guest-sign-in'));
    expect(router.navigate).toHaveBeenCalledWith(signInRoute('/discover'));
    expect(signInRoute('/discover')).toBe('/maxina?redirectTo=%2Fdiscover');
  });

  it('signed in with a member feed: no guest card', async () => {
    const { wrapper } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    await screen.findByTestId(`featured-card-${product(1).id}`);
    expect(screen.queryByTestId('discover-guest-cta')).toBeNull();
  });
});

describe('/discover — utility rail', () => {
  it('search expands to the field and collapses; calendar opens /calendar with the upcoming badge', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const { wrapper } = discoverWrapper(routes(), { tables: { calendar_events: [{ id: 'e1', user_id: 'u-1', start_time: future, status: 'conflict' }] } });
    render(<DiscoverScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('discover-search-open'));
    expect(screen.getByTestId('discover-search-input').props.placeholder).toBe('Search...');
    fireEvent.press(screen.getByTestId('discover-search-close'));
    expect(screen.getByTestId('discover-search-open')).toBeTruthy();
    expect((await screen.findByTestId('discover-calendar-count')).props.accessibilityLabel).toBe('1 upcoming events');
    expect(screen.getByTestId('discover-calendar-conflict')).toBeTruthy();
    fireEvent.press(screen.getByTestId('discover-calendar-button'));
    expect(router.navigate).toHaveBeenCalledWith('/calendar');
  });

  it('Life Compass and Autopilot open their global popups on the overlay bus; the Index pill opens /health', async () => {
    const compass = jest.fn();
    const autopilot = jest.fn();
    overlayBus.on('vitana:open-life-compass', compass);
    overlayBus.on('autopilot:open', autopilot);
    const { wrapper, requests } = discoverWrapper(routes(), { tables: { vitana_index_scores: [{ user_id: 'u-1', date: '2026-11-01', score_total: 512 }] } });
    render(<DiscoverScreen />, { wrapper });
    fireEvent.press(screen.getByTestId('discover-life-compass'));
    fireEvent.press(screen.getByTestId('discover-autopilot-pill'));
    expect(compass).toHaveBeenCalledTimes(1);
    expect(autopilot).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('512')).toBeTruthy());
    fireEvent.press(screen.getByTestId('discover-index-pill'));
    expect(router.navigate).toHaveBeenCalledWith('/health');
    const count = requests.find((r) => r.path === '/autopilot/recommendations/count');
    expect(count?.query.get('role')).toBe('community');
    expect(count?.headers['x-user-id']).toBe('u-1');
    expect(count?.headers['x-vitana-active-role']).toBe('community');
  });

  it('iOS IAP gate unchanged: the gift voucher is hidden on iOS, shown on Android with its tiers and checkout', async () => {
    setOS('ios');
    const a = discoverWrapper(routes());
    const ios = render(<DiscoverScreen />, { wrapper: a.wrapper });
    expect(screen.queryByTestId('discover-gift-voucher')).toBeNull();
    expect(screen.queryByTestId('voucher-modal')).toBeNull();
    ios.unmount();
    setOS('android');
    const b = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper: b.wrapper });
    fireEvent.press(screen.getByTestId('discover-gift-voucher'));
    fireEvent.press(await screen.findByTestId('voucher-tier-experience'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('voucher-buy'));
    });
    expect(b.db.invokes).toEqual([{ name: 'stripe-create-voucher-checkout', body: { tier: 'experience', returnTo: '/discover' } }]);
    setOS('ios');
  });
});

describe('/discover — deep link + telemetry', () => {
  it('?m=<match> is cleared at once and ends in the "match not found" toast', () => {
    jest.useFakeTimers();
    try {
      searchParams.current = { m: 'match-1' };
      const { wrapper } = discoverWrapper(routes());
      render(<DiscoverScreen />, { wrapper });
      expect(router.setParams).toHaveBeenCalledWith({ m: undefined });
      act(() => {
        jest.advanceTimersByTime(MATCH_GIVE_UP_MS);
      });
      expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.discover.matchNotFound');
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs one discover.view activity row for the member', async () => {
    const { wrapper, db } = discoverWrapper(routes());
    render(<DiscoverScreen />, { wrapper });
    await waitFor(() => expect(db.ops.some((o) => o.table === 'user_activity_log')).toBe(true));
    const row = db.ops.find((o) => o.table === 'user_activity_log');
    expect(row?.op).toBe('insert');
    expect(row?.values).toMatchObject({ user_id: 'u-1', activity_type: 'discover.view', activity_data: { page: 'overview' } });
  });
});
