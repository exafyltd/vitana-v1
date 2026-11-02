/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/shop`: the feed
 * states (role-blocked, error + retry, empty), autoplay of the on-screen card
 * and pause while a sheet is open, the anchor → peek drawer → full product
 * drawer mapping with its view-funnel events, the video-shop add-to-cart body,
 * the batched impression telemetry, and the pure mappers.
 */
import '../helpers/no-network';
import { players, router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { ShopFeedScreen, priceLabel, toMarketplaceProduct } from '../../src/screens/discover/ShopFeedScreen';
import { budget, discoverWrapper, emptyCart, status, UUID } from './helpers';

afterEach(() => {
  jest.clearAllMocks();
  players.length = 0;
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const shopProduct = (n: number, extra: Record<string, unknown> = {}) => ({
  id: UUID(n),
  title: `Shop item ${n}`,
  price_cents: 2500,
  currency: 'EUR',
  compare_at_price_cents: 3000,
  images: [],
  affiliate_url: null,
  availability: 'in_stock',
  in_stock: true,
  rating: 4.6,
  review_count: 31,
  merchant_id: 'm-1',
  brand: 'Brandy',
  ...extra,
});
const video = (n: number) => ({
  id: `v${n}`,
  title: `Video ${n}`,
  caption: `Caption ${n}`,
  creator_id: 'creator-1',
  playback: { video_url: `https://cdn.g1-test.example.org/v${n}.mp4`, poster_url: null, thumbnail_url: null, duration_ms: 1000, aspect_ratio: '9:16' },
  primary_anchor: { id: `a${n}`, label: `Anchor ${n}`, appear_at_ms: 0, pos_x: 0, pos_y: 0, badge_price_cents: 2500, currency: 'EUR', product: shopProduct(n) },
});

const base = {
  'GET /shop-feed/videos': { ok: true, videos: [video(1), video(2)], next_cursor: null },
  'GET /shop-feed/videos/v1/anchor': { ok: true, anchor: { id: 'a1', label: 'Anchor 1', badge_price_cents: 2500, currency: 'EUR', product: shopProduct(1) } },
  'POST /shop-feed/videos/v1/events': { ok: true },
  'POST /shop-feed/events/batch': { ok: true },
  'GET /universal-cart': emptyCart,
  'GET /universal-cart/budget': budget,
  'POST /universal-cart/items': { ok: true, cart_id: 'c', item: {}, action: 'created', cart_created: true },
  'GET /discover/my-recommendations': { ok: true, items: [] },
};

describe('/shop — feed states', () => {
  it('role-blocked (403): the community-only state', async () => {
    const { wrapper } = discoverWrapper({ 'GET /shop-feed/videos': status(403, { ok: false, error: 'cart_unavailable_for_role' }) });
    render(<ShopFeedScreen />, { wrapper });
    expect(await screen.findByTestId('shop-role-blocked')).toBeTruthy();
  });

  it('error: the error state, retry reads the feed again', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /shop-feed/videos': status(500, { ok: false, error: 'down' }) });
    render(<ShopFeedScreen />, { wrapper });
    // the hook retries a 500 once (web retry rule, react-query's 1 s delay) before the error state
    fireEvent.press(await screen.findByTestId('shop-retry', {}, { timeout: 5000 }));
    await waitFor(() => expect(requests.filter((r) => r.path === '/shop-feed/videos').length).toBeGreaterThanOrEqual(3), { timeout: 5000 });
  });

  it('empty: "Browse Discover" goes to /discover', async () => {
    const { wrapper, requests } = discoverWrapper({ 'GET /shop-feed/videos': { ok: true, videos: [], next_cursor: null } });
    render(<ShopFeedScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('shop-browse-discover'));
    expect(router.navigate).toHaveBeenCalledWith('/discover');
    const feed = requests.find((r) => r.path === '/shop-feed/videos');
    expect(feed?.query.toString()).toBe('limit=10');
    expect(feed?.headers['x-vitana-active-role']).toBe('community');
  });
});

describe('/shop — autoplay, anchor → peek → PDP', () => {
  it('plays the on-screen card muted, keeps the others paused, pauses while the peek drawer is open', async () => {
    const { wrapper } = discoverWrapper(base);
    render(<ShopFeedScreen />, { wrapper });
    await screen.findByTestId('shop-video-v1');
    const p1 = players.find((p) => p.source.endsWith('v1.mp4'))!;
    const p2 = players.find((p) => p.source.endsWith('v2.mp4'))!;
    await waitFor(() => expect(p1.play).toHaveBeenCalled());
    expect(p1.loop).toBe(true);
    expect(p1.muted).toBe(true);
    expect(p2.play).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('shop-mute-v1'));
    expect(p1.muted).toBe(false);
    p1.pause.mockClear();
    fireEvent.press(screen.getByTestId('shop-anchor-v1'));
    await waitFor(() => expect(p1.pause).toHaveBeenCalled());
  });

  it('anchor tap emits anchor_tap + drawer_open, the live anchor fills the peek drawer, add to cart sends the video-shop attribution', async () => {
    const { wrapper, requests } = discoverWrapper(base);
    render(<ShopFeedScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('shop-anchor-v1'));
    expect(await screen.findByTestId('shop-peek-product')).toBeTruthy();
    const events = requests.filter((r) => r.path === '/shop-feed/videos/v1/events').map((r) => r.body.type);
    expect(events).toEqual(['anchor_tap', 'drawer_open']);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shop-peek-add'));
    });
    const post = requests.find((r) => r.method === 'POST' && r.path === '/universal-cart/items');
    expect(post?.body).toEqual({
      product_id: UUID(1),
      item_type: 'partner_product',
      quantity: 1,
      source_surface: 'video_shop',
      source_ref: 'v1',
      source_video_id: 'v1',
      source_creator_id: 'creator-1',
      merchant_id: 'm-1',
      unit_price_cents_snapshot: 2500,
      currency_snapshot: 'EUR',
    });
    expect(requests.some((r) => r.path === '/shop-feed/videos/v1/events' && r.body.type === 'add_to_cart')).toBe(true);
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('videoShop.drawer.addedTitle');
  });

  it('"More details" emits drawer_expand and opens the full product drawer; "Go to cart" opens /universal-cart', async () => {
    const { wrapper, requests } = discoverWrapper(base);
    render(<ShopFeedScreen />, { wrapper });
    fireEvent.press(await screen.findByTestId('shop-anchor-v1'));
    fireEvent.press(await screen.findByTestId('shop-peek-cart'));
    expect(router.navigate).toHaveBeenCalledWith('/universal-cart');
    fireEvent.press(screen.getByTestId('shop-peek-more'));
    expect(await screen.findByTestId('product-details')).toBeTruthy();
    expect(screen.getByText('Brandy')).toBeTruthy();
    expect(requests.some((r) => r.body?.type === 'drawer_expand')).toBe(true);
  });

  it('a 404 anchor shows "no longer available"; an out-of-stock product disables add to cart', async () => {
    const a = discoverWrapper({ ...base, 'GET /shop-feed/videos/v1/anchor': status(404, { ok: false, error: 'anchor_unavailable' }) });
    const r1 = render(<ShopFeedScreen />, { wrapper: a.wrapper });
    fireEvent.press(await screen.findByTestId('shop-anchor-v1'));
    expect(await screen.findByTestId('shop-peek-unavailable')).toBeTruthy();
    r1.unmount();
    const b = discoverWrapper({ ...base, 'GET /shop-feed/videos/v1/anchor': { ok: true, anchor: { id: 'a1', label: 'A', badge_price_cents: null, currency: null, product: shopProduct(1, { in_stock: false }) } } });
    render(<ShopFeedScreen />, { wrapper: b.wrapper });
    fireEvent.press(await screen.findByTestId('shop-anchor-v1'));
    await screen.findByTestId('shop-peek-product');
    expect(screen.getByTestId('shop-peek-add').props.accessibilityState.disabled).toBe(true);
  });
});

describe('/shop — telemetry batching', () => {
  it('impression + hold_2s are batched to POST /shop-feed/events/batch', async () => {
    jest.useFakeTimers();
    try {
      const { wrapper, requests } = discoverWrapper(base);
      render(<ShopFeedScreen />, { wrapper });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2_100);
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5_100);
      });
      const batch = requests.find((r) => r.path === '/shop-feed/events/batch');
      expect(batch?.body.events.map((e: { type: string; video_id: string }) => `${e.type}:${e.video_id}`)).toEqual(['impression:v1', 'hold_2s:v1']);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('/shop — pure mappers', () => {
  it('toMarketplaceProduct keeps the PDP fields; priceLabel formats EUR / USD minor units', () => {
    const p = toMarketplaceProduct(shopProduct(3, { dosage: '1 cap', health_goals: ['sleep'] }) as never);
    expect(p).toMatchObject({ id: UUID(3), title: 'Shop item 3', brand: 'Brandy', dosage: '1 cap', health_goals: ['sleep'], ingredients_primary: [], images: [] });
    expect(priceLabel(2500, 'usd', 'en-US')).toBe('$25.00');
    expect(priceLabel(2500, 'GBP', 'en-US')).toBe('€25.00');
    expect(priceLabel(null, 'EUR', 'en-US')).toBe('');
  });
});
