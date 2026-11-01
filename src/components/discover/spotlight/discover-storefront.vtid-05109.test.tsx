/**
 * VTID-05109 — Discover storefront (Spotlight): one hero spotlight card,
 * shelves of standard cards, honest empty states instead of sample data,
 * wired search + chips, one quick-view sheet for products / services /
 * providers, and the sub-page panes.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';

vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/cart/AddToCartButton', () => ({ AddToCartButton: () => <button type="button">cart</button> }));
vi.mock('@/components/discover/RecommendButton', () => ({ RecommendButton: () => null }));
vi.mock('@/components/sharing/UniversalShareButton', () => ({ UniversalShareButton: () => null }));
vi.mock('@/components/discover/HiddenByLimitationsFooter', () => ({ HiddenByLimitationsFooter: () => null }));
vi.mock('@/components/discover/AffiliateDisclosure', () => ({ AffiliateDisclosure: () => null }));

const bookmarks = { list: [] as Array<Record<string, unknown>>, loading: false, remove: vi.fn() };
vi.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    isLoading: bookmarks.loading,
    getBookmarksByType: (type: string) => bookmarks.list.filter((b) => b.item_type === type),
    removeBookmark: bookmarks.remove,
  }),
}));

type Q = { data?: unknown; isLoading?: boolean; isError?: boolean; refetch?: () => void };
const feedQ = vi.fn<(opts: unknown) => Q>();
const searchQ = vi.fn<(params: Record<string, unknown>, opts?: { enabled?: boolean }) => Q>();
const recsQ = vi.fn<(opts: unknown) => Q>();
vi.mock('@/hooks/useMarketplace', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useMarketplace')>()),
  useMarketplaceFeed: (o: unknown) => feedQ(o),
  useMarketplaceSearch: (p: Record<string, unknown>, o?: { enabled?: boolean }) => searchQ(p, o),
  useMyRecommendations: (o: unknown) => recsQ(o),
}));

import { DiscoverStorefront } from './DiscoverStorefront';
import { DealsPanes, DoctorsCoachesPanes, SupplementsPanes, WellnessServicesPanes } from './DiscoverSectionPanes';
import { buildStorefrontSearch, inlineEndSide, isResultsMode, NO_FILTERS, realDeals } from './storefront-model';
import { SplitBar } from '@/components/ui/split-bar';

const prod = (id: string, over: Partial<MarketplaceProduct> = {}): MarketplaceProduct =>
  ({
    id,
    title: `Product ${id}`,
    description: `About ${id}`,
    brand: 'Brand',
    category: 'supplements',
    subcategory: 'sleep',
    price_cents: 1990,
    currency: 'EUR',
    compare_at_price_cents: null,
    images: [],
    rating: 4.6,
    review_count: 10,
    ingredients_primary: [],
    health_goals: [],
    dietary_tags: [],
    ...over,
  }) as unknown as MarketplaceProduct;

const ok = (data: unknown): Q => ({ data, isLoading: false, isError: false, refetch: vi.fn() });

function setData({
  feed = [prod('f1'), prod('f2'), prod('f3'), prod('f4'), prod('f5'), prod('f6')],
  supplements = [prod('s1'), prod('s2'), prod('s3'), prod('s4'), prod('s5')],
  deals = [prod('d1', { compare_at_price_cents: 2990 }), prod('d2'), prod('d3', { compare_at_price_cents: 2500 })],
  results = [prod('r1'), prod('r2'), prod('r3')],
  recs = [] as unknown[],
} = {}) {
  feedQ.mockImplementation(() => ok({ items: feed, hidden_breakdown: {} }));
  searchQ.mockImplementation((p) => {
    if (p.q || p.health_goals || p.price_max_cents || p.rating_min) return ok({ items: results, total_count: results.length });
    if (p.category === 'supplements') return ok({ items: supplements, total_count: supplements.length });
    return ok({ items: deals, total_count: deals.length });
  });
  recsQ.mockImplementation(() => ok({ ok: true, items: recs }));
}

const renderStorefront = (props: Partial<React.ComponentProps<typeof DiscoverStorefront>> = {}) =>
  render(
    <MemoryRouter>
      <DiscoverStorefront query="" onClearQuery={vi.fn()} isGuest={false} onSignIn={vi.fn()} {...props} />
    </MemoryRouter>,
  );

beforeEach(() => {
  feedQ.mockReset();
  searchQ.mockReset();
  recsQ.mockReset();
  bookmarks.list = [];
  bookmarks.loading = false;
  setData();
});
afterEach(() => {
  vi.useRealTimers();
  document.documentElement.dir = '';
});

describe('VTID-05109 storefront model', () => {
  it('maps search text and chips onto the existing gateway search contract only', () => {
    expect(buildStorefrontSearch('  magnesium ', NO_FILTERS)).toEqual({ sort: 'relevance', limit: 24, q: 'magnesium' });
    expect(buildStorefrontSearch('', { goal: 'sleep', underPrice: true, topRated: true })).toEqual({
      sort: 'relevance', limit: 24, health_goals: ['better-sleep'], price_max_cents: 3000, rating_min: 4.5,
    });
    expect(isResultsMode('', NO_FILTERS)).toBe(false);
    expect(isResultsMode(' x ', NO_FILTERS)).toBe(true);
    expect(isResultsMode('', { ...NO_FILTERS, topRated: true })).toBe(true);
  });

  it('deals are real discounts only', () => {
    expect(realDeals([prod('a', { compare_at_price_cents: 2500 }), prod('b'), prod('c', { compare_at_price_cents: 100 })]).map((p) => p.id)).toEqual(['a']);
  });

  it('the quick view opens from the inline-end side (right in LTR, left in RTL)', () => {
    expect(inlineEndSide()).toBe('right');
    document.documentElement.dir = 'rtl';
    expect(inlineEndSide()).toBe('left');
  });
});

describe('VTID-05109 DiscoverStorefront', () => {
  // VTID-05416 — contract changed on purpose (owner-approved layout 2026-10-31, SR-31): the overview hero is the
  // one Spotlight card of a Spotlight grid with six standard tiles beside it, replacing the "picks" shelf.
  const eightFeed = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'].map((id) => prod(id));

  it('VTID-05416 the overview is the SR-31 Spotlight grid: one spotlight card (the "Picked for you" top pick) with its label', () => {
    setData({ feed: eightFeed });
    const { container } = renderStorefront();
    const grid = container.querySelector('[data-discover-hero] [data-spotlight-grid]') as HTMLElement;
    expect(grid).not.toBeNull();
    const spot = container.querySelectorAll('[data-vcard-size="spotlight"]');
    expect(spot).toHaveLength(1);
    expect(grid.querySelector('[data-slot="spotlight"] [data-vcard-size="spotlight"]')).toBe(spot[0]);
    expect(within(spot[0] as HTMLElement).getByText('Product f1')).toBeInTheDocument();
    expect(within(spot[0] as HTMLElement).getByText('spotlightDiscover.storefront.hero.pickedForYou')).toBeInTheDocument();
    // Spotlight identity (VCard.spotlightLabel) on the stacked hero variant only.
    expect(spot[0].getAttribute('data-hero-variant')).toBe('stacked');
    expect(spot[0].querySelector('[data-vcard-spotlight-label]')).not.toBeNull();
    expect(within(spot[0] as HTMLElement).getByText('spotlightDiscover.card.quickView')).toBeInTheDocument();
    // The section heading and "See all" to the existing AI picks route.
    expect(screen.getByText('spotlight.grid.discover.section')).toBeInTheDocument();
    expect(screen.getByText('spotlight.grid.seeAll').closest('a')).toHaveAttribute('href', '/discover/ai-picks');
    // The old "picks" shelf is gone — the tiles replace it.
    expect(container.querySelector('[data-discover-shelf="picks"]')).toBeNull();
  });

  it('VTID-05416 six standard tiles beside the spotlight: feed items 2-7 in order, extra items not rendered', () => {
    setData({ feed: eightFeed });
    const { container } = renderStorefront();
    const tiles = container.querySelector('[data-spotlight-grid] [data-slot="tiles"]')!;
    const cards = tiles.querySelectorAll('[data-vcard-size]');
    expect(cards).toHaveLength(6);
    expect([...cards].every((c) => c.getAttribute('data-vcard-size') === 'standard')).toBe(true);
    expect([...cards].map((c) => c.getAttribute('data-product-id'))).toEqual(['f2', 'f3', 'f4', 'f5', 'f6', 'f7']);
    expect(container.querySelector('[data-product-id="f8"]')).toBeNull();
    // Tiles are articles (they sit in the grid's div cells), never list items outside a list.
    expect(tiles.querySelectorAll('li')).toHaveLength(0);
  });

  it('VTID-05416 "Browse categories" row: compact links to the existing Discover sub-routes only', () => {
    const { container } = renderStorefront();
    const row = container.querySelector('[data-spotlight-grid] [data-slot="row"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(within(row).getByText('spotlight.grid.discover.browseCategories')).toBeInTheDocument();
    const cards = row.querySelectorAll('[data-vcard-size]');
    expect(cards).toHaveLength(5);
    expect([...cards].every((c) => c.getAttribute('data-vcard-size') === 'compact')).toBe(true);
    expect([...row.querySelectorAll('[data-discover-category] a')].map((a) => a.getAttribute('href'))).toEqual([
      '/discover/supplements',
      '/discover/wellness-services',
      '/discover/doctors-coaches',
      '/discover/deals-offers',
      '/discover/marketplace',
    ]);
    expect(within(row).getByText('screens.discover.marketplace').closest('a')).toHaveAttribute('href', '/discover/marketplace');
    // Compact cards only in the row; nothing compact or row-sized anywhere else.
    expect(container.querySelectorAll('[data-vcard-size="compact"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-vcard-size="row"]')).toHaveLength(0);
  });

  it('the shelves stay below the grid as standard cards; deals are real discounts only', () => {
    const { container } = renderStorefront();
    const supp = container.querySelector('[data-discover-shelf="supplements"]')!;
    expect(supp.querySelectorAll('[data-vcard-size="standard"]')).toHaveLength(4);
    expect(within(supp as HTMLElement).getByText('spotlightDiscover.card.seeAll').closest('a')).toHaveAttribute('href', '/discover/supplements');
    // The grid comes before the shelves in reading order.
    const grid = container.querySelector('[data-spotlight-grid]')!;
    expect(grid.compareDocumentPosition(supp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Deals shelf: real discounts only.
    const deals = container.querySelector('[data-discover-shelf="deals"]')!;
    expect([...deals.querySelectorAll('[data-product-id]')].map((e) => e.getAttribute('data-product-id'))).toEqual(['d1', 'd3']);
    // Shelves never mix sizes.
    expect(container.querySelectorAll('[data-discover-shelf] [data-vcard-size]:not([data-vcard-size="standard"])')).toHaveLength(0);
  });

  it('VTID-05416 fewer feed items (D4): tiles are never fabricated; one item → the empty state fills the tile area', () => {
    setData({ feed: [prod('f1'), prod('f2'), prod('f3')] });
    const { container, unmount } = renderStorefront();
    const tiles = container.querySelector('[data-slot="tiles"]')!;
    expect(tiles.querySelectorAll('[data-vcard-size]')).toHaveLength(2);
    expect(tiles.querySelector('[data-vcard-skeleton]')).toBeNull();
    expect([...tiles.querySelectorAll('[data-product-id]')].map((e) => e.getAttribute('data-product-id'))).toEqual(['f2', 'f3']);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    unmount();

    setData({ feed: [prod('f1')] });
    const one = renderStorefront();
    const oneTiles = one.container.querySelector('[data-slot="tiles"]')!;
    expect(oneTiles.querySelectorAll('[data-vcard-size]')).toHaveLength(0);
    expect(oneTiles.querySelector('[data-discover-empty]')).not.toBeNull();
    expect(within(oneTiles as HTMLElement).getByText('spotlight.grid.emptyTiles')).toBeInTheDocument();
    expect(one.container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    one.unmount();

    // Empty feed → the shared empty state, no grid and no spotlight card.
    setData({ feed: [] });
    const none = renderStorefront();
    expect(none.container.querySelector('[data-discover-hero] [data-discover-empty]')).not.toBeNull();
    expect(none.container.querySelector('[data-spotlight-grid]')).toBeNull();
    expect(none.container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(0);
  });

  it('services and doctors/coaches have no real catalog → empty states, never sample items (SR-24)', () => {
    const { container } = renderStorefront();
    for (const id of ['services', 'coaches']) {
      const shelf = container.querySelector(`[data-discover-shelf="${id}"]`)!;
      expect(shelf.querySelector('[data-discover-empty]')).not.toBeNull();
      expect(shelf.querySelectorAll('[data-vcard-size]')).toHaveLength(0);
    }
    // None of the legacy fabricated numbers / sample items appear.
    const text = container.textContent ?? '';
    for (const fake of ['$2,693', '424', '247', 'Top 5', 'Longevity Essentials Bundle', 'Dr. Sarah Chen']) {
      expect(text).not.toContain(fake);
    }
  });

  it('Share & Earn: guest → sign-in empty state; member → own recommendations with real counters', () => {
    const onSignIn = vi.fn();
    const { container, unmount } = renderStorefront({ isGuest: true, onSignIn });
    const share = container.querySelector('[data-discover-shelf="share"]') as HTMLElement;
    fireEvent.click(within(share).getByText('spotlightDiscover.storefront.empty.signIn'));
    expect(onSignIn).toHaveBeenCalled();
    expect(recsQ).toHaveBeenCalledWith({ enabled: false });
    unmount();

    setData({
      recs: [{ id: 'r1', product_id: 'p9', product_title: 'Omega-3', product_thumbnail_url: null, status: 'active', click_count: 12, conversion_count: 1, commission_earned_minor: 300, currency: 'EUR', created_at: '' }],
    });
    const second = renderStorefront();
    const share2 = second.container.querySelector('[data-discover-shelf="share"]') as HTMLElement;
    expect(within(share2).getByText('Omega-3')).toBeInTheDocument();
    expect(share2.textContent).toContain('"clicks":"12"');
  });

  it('member without recommendations sees an empty state, not sample bundles', () => {
    const { container } = renderStorefront();
    const share = container.querySelector('[data-discover-shelf="share"]')!;
    expect(share.querySelector('[data-discover-empty]')).not.toBeNull();
  });

  it('loading shows VCard skeletons (no spinner), error offers a retry', () => {
    feedQ.mockImplementation(() => ({ isLoading: true }));
    const { container, unmount } = renderStorefront();
    expect(container.querySelector('[data-discover-hero] [data-vcard-skeleton]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
    // VTID-05416 — the skeleton has the grid's shape (D7): 1 spotlight + 6 standard + the compact row.
    const grid = container.querySelector('[data-discover-hero] [data-spotlight-grid]')!;
    expect(grid.querySelectorAll('[data-slot="spotlight"] [data-vcard-skeleton][data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(grid.querySelectorAll('[data-slot="tiles"] [data-vcard-skeleton][data-vcard-size="standard"]')).toHaveLength(6);
    expect(grid.querySelectorAll('[data-slot="row"] [data-vcard-skeleton][data-vcard-size="compact"]')).toHaveLength(5);
    unmount();

    const refetch = vi.fn();
    feedQ.mockImplementation(() => ({ isError: true, isLoading: false, refetch }));
    const r = renderStorefront();
    fireEvent.click(within(r.container.querySelector('[data-discover-hero]') as HTMLElement).getByText('spotlightDiscover.storefront.error.retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('the overview search is wired: typing switches to real results with the top result as the hero', () => {
    vi.useFakeTimers();
    const { container } = renderStorefront({ query: 'magnesium' });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(searchQ).toHaveBeenCalledWith(expect.objectContaining({ q: 'magnesium' }), { enabled: true });
    const results = container.querySelector('[data-discover-results]')!;
    expect(results).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(within(results as HTMLElement).getByText('spotlightDiscover.storefront.hero.topResult')).toBeInTheDocument();
    expect(results.querySelectorAll('[data-vcard-size="standard"]')).toHaveLength(2);
    expect(container.querySelector('[data-discover-shelf="supplements"]')).toBeNull();
    // VTID-05416 — results mode keeps its own side-by-side hero, no Spotlight grid and no Spotlight label.
    const hero = results.querySelector('[data-vcard-size="spotlight"]')!;
    expect(hero.getAttribute('data-hero-variant')).toBe('side');
    expect(hero.querySelector('[data-vcard-spotlight-label]')).toBeNull();
    expect(container.querySelector('[data-spotlight-grid]')).toBeNull();
  });

  it('chips have handlers and drive the search; "clear filters" resets query and chips', () => {
    const onClearQuery = vi.fn();
    setData({ results: [] });
    const { container } = renderStorefront({ onClearQuery });
    const sleep = screen.getByText('spotlightDiscover.storefront.chips.sleep');
    fireEvent.click(sleep);
    expect(sleep).toHaveAttribute('aria-pressed', 'true');
    expect(searchQ).toHaveBeenCalledWith(expect.objectContaining({ health_goals: ['better-sleep'] }), { enabled: true });
    fireEvent.click(screen.getByText('spotlightDiscover.storefront.empty.clearFilters'));
    expect(onClearQuery).toHaveBeenCalled();
    expect(screen.getByText('spotlightDiscover.storefront.chips.sleep')).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-discover-results]')).toBeNull();
  });

  it('a card opens the quick-view sheet (with "Open full page"), Escape closes it', () => {
    renderStorefront();
    fireEvent.click(screen.getByText('Product f2'));
    const sheet = document.querySelector('[data-discover-quick-view]') as HTMLElement;
    expect(sheet).not.toBeNull();
    expect(within(sheet).getByText('screens.discover.openFullPage').closest('a')).toHaveAttribute('href', '/discover/product/f2');
    fireEvent.keyDown(sheet, { key: 'Escape' });
    expect(document.querySelector('[data-discover-quick-view]')).toBeNull();
  });

  it('VTID-05416 the Discover page opts its storefront ScreenFrame into the Spotlight grid layout', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/pages/Discover.tsx'), 'utf8');
    const frame = src.slice(src.indexOf('<ScreenFrame'), src.indexOf('<DiscoverStorefront'));
    expect(frame).toContain('archetype="storefront"');
    expect(frame).toContain('layout="spotlight-grid"');
  });

  it('?tab=share deep link scrolls the Share & Earn shelf into view', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    renderStorefront({ initialSection: 'share' });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(spy).toHaveBeenCalled();
  });
});

describe('VTID-05109 Discover sub-page panes', () => {
  const inTabs = (value: string, ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <SplitBar value={value} onValueChange={() => undefined}>
          {ui}
        </SplitBar>
      </MemoryRouter>,
    );

  it('Supplements: subcategory + sort chips drive the real search; results are a standard grid', () => {
    const { container } = inTabs('browse', <SupplementsPanes query="" />);
    expect(container.querySelectorAll('[data-discover-grid] [data-vcard-size="standard"]')).toHaveLength(5);
    fireEvent.click(screen.getByText('spotlightDiscover.supplements.sub.minerals'));
    expect(searchQ).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'supplements', subcategory: 'minerals' }), undefined);
    fireEvent.click(screen.getByText('spotlightDiscover.supplements.sort.priceAsc'));
    expect(searchQ).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'price_asc' }), undefined);
    expect(container.querySelector('[data-vcard-size="spotlight"]')).toBeNull();
  });

  it('Doctors/Coaches: no sample providers and no dead filters; saved providers open the quick view', () => {
    const { container, unmount } = inTabs('find', <DoctorsCoachesPanes query="" />);
    expect(container.querySelector('[data-discover-empty]')).not.toBeNull();
    expect(container.querySelector('[role="combobox"], select')).toBeNull();
    expect(container.textContent).not.toContain('Dr. Sarah Chen');
    unmount();

    bookmarks.list = [{ id: 'b1', item_type: 'provider', item_id: '7', item_name: 'Dr. Saved', item_metadata: { specialty: 'Sleep' } }];
    inTabs('myproviders', <DoctorsCoachesPanes query="" />);
    fireEvent.click(screen.getByText('Dr. Saved'));
    const sheet = document.querySelector('[data-discover-quick-view]') as HTMLElement;
    expect(within(sheet).getByText('spotlightDiscover.card.openFullPage').closest('a')).toHaveAttribute('href', '/discover/provider/7');
  });

  it('Wellness services: saved items are filtered by the utility search; catalog tabs are empty states', () => {
    bookmarks.list = [
      { id: 'b1', item_type: 'wellness_service', item_id: 's1', item_name: 'Float therapy' },
      { id: 'b2', item_type: 'wellness_service', item_id: 's2', item_name: 'Sauna' },
    ];
    const { container, unmount } = inTabs('bookmarked', <WellnessServicesPanes query="sau" />);
    expect(container.querySelectorAll('[data-vcard-size="standard"]')).toHaveLength(1);
    expect(screen.getByText('Sauna')).toBeInTheDocument();
    unmount();
    const r = inTabs('categories', <WellnessServicesPanes query="" />);
    expect(r.container.querySelector('[data-discover-empty]')).not.toBeNull();
    expect(r.container.querySelectorAll('[data-vcard-size]')).toHaveLength(0);
  });

  it('Deals: one hero deal + standard grid of real discounts; trending is an honest empty state', () => {
    setData({
      deals: [prod('d1', { compare_at_price_cents: 2990 }), prod('d2', { compare_at_price_cents: 2500 }), prod('d3')],
    });
    const { container, unmount } = inTabs('flash', <DealsPanes query="" />);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect([...container.querySelectorAll('[data-product-id]')].map((e) => e.getAttribute('data-product-id'))).toEqual(['d1', 'd2']);
    unmount();
    const r = inTabs('trending', <DealsPanes query="" />);
    expect(r.container.querySelector('[data-discover-empty]')).not.toBeNull();
  });

  it('VTID-05117 Deals: no real discount → the one hero is an honest text-only spotlight, no sample deal', () => {
    setData({ deals: [prod('d1'), prod('d2')] });
    const { container } = inTabs('flash', <DealsPanes query="" />);
    const heroes = container.querySelectorAll('[data-vcard-size="spotlight"]');
    expect(heroes).toHaveLength(1);
    expect(heroes[0].hasAttribute('data-deals-empty')).toBe(true);
    expect(heroes[0].querySelector('[data-vcard-media]')).toBeNull();
    expect(container.querySelectorAll('[data-product-id]')).toHaveLength(0);
    expect(screen.getByText('spotlightDiscover.storefront.empty.dealsTitle')).toBeInTheDocument();
  });
});
