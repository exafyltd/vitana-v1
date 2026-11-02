/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — i18n and RTL:
 * every Discover screen renders with no unresolved catalog key in all 11
 * locales, Arabic renders the Arabic catalog, every discoverCommerceNative key
 * exists in all 11 shards with German's placeholders (DE first), the lane's
 * files use start/end only, and the route files render their screens.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { DiscoverScreen } from '../../src/screens/discover/DiscoverScreen';
import { SupplementsScreen } from '../../src/screens/discover/SupplementsScreen';
import { WellnessServicesScreen } from '../../src/screens/discover/WellnessServicesScreen';
import { DealsOffersScreen } from '../../src/screens/discover/DealsOffersScreen';
import { CategoryProductsScreen } from '../../src/screens/discover/CategoryProductsScreen';
import { ShopFeedScreen } from '../../src/screens/discover/ShopFeedScreen';
import { budget, discoverWrapper, emptyCart, feedResult, flush, product, searchResult, UUID } from './helpers';

jest.setTimeout(30000);

afterEach(() => {
  searchParams.current = {};
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

const routes = {
  'GET /discover/feed': feedResult([product(1), product(2)], true),
  'GET /discover/search': searchResult([product(1, { price_cents: 800, compare_at_price_cents: 1000 }), product(2, { subcategory: 'adaptogens' })], { allergies: 1, contraindications: 0, medications: 0, dietary: 0, budget: 0, sensitivities: 0, geo: 0, excluded_region: 0 }),
  'GET /discover/my-recommendations': { ok: true, items: [] },
  'GET /universal-cart': emptyCart,
  'GET /universal-cart/budget': budget,
  'GET /shop-feed/videos': {
    ok: true,
    videos: [{ id: 'v1', title: 'V', caption: 'C', creator_id: null, playback: { video_url: 'https://cdn.g1-test.example.org/v.mp4', poster_url: null, thumbnail_url: null, duration_ms: 1, aspect_ratio: '9:16' }, primary_anchor: { id: 'a1', label: 'L', appear_at_ms: 0, pos_x: 0, pos_y: 0, badge_price_cents: 100, currency: 'EUR', product: { id: UUID(1), title: 'P', price_cents: 100, currency: 'EUR', compare_at_price_cents: null, images: [], affiliate_url: null, availability: 'in_stock', in_stock: true, rating: null, review_count: null, merchant_id: null } } }],
    next_cursor: null,
  },
};

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
function allStrings(root: ReactTestInstance): string[] {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: every Discover screen renders no unresolved key', async (locale) => {
    const { wrapper } = discoverWrapper(routes, { language: languageFromLocale(locale) });
    searchParams.current = { subcategory: 'longevity' };
    const els = [<DiscoverScreen key="d" />, <SupplementsScreen key="s" />, <WellnessServicesScreen key="w" />, <DealsOffersScreen key="o" />, <CategoryProductsScreen key="c" />, <ShopFeedScreen key="f" />];
    for (const el of els) {
      const r = render(el, { wrapper });
      await act(async () => {
        await flush();
        await flush();
      });
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
  }, 60_000);

  it('the quick actions, hidden-reason rows, category select and Life Compass popup resolve in every locale', async () => {
    for (const locale of LOCALES) {
      const { wrapper } = discoverWrapper(routes, { language: languageFromLocale(locale) });
      const r = render(<SupplementsScreen />, { wrapper });
      await act(async () => {
        await flush();
        await flush();
      });
      fireEvent.press(screen.getByTestId('discover-life-compass'));
      expect(await screen.findByTestId('life-compass-goal-wealth')).toBeTruthy();
      fireEvent.press(screen.getByTestId('hidden-by-limitations-toggle', { includeHiddenElements: true }));
      fireEvent.press(screen.getByTestId('discover-action-button', { includeHiddenElements: true }));
      fireEvent.press(screen.getByTestId('supplements-category', { includeHiddenElements: true }));
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, raw }).toEqual({ locale, raw: [] });
      r.unmount();
    }
  }, 60_000);

  it('Arabic (RTL) renders the Discover screen with the Arabic catalog', async () => {
    const { wrapper } = discoverWrapper(routes, { language: 'ar-XA' });
    render(<DiscoverScreen />, { wrapper });
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/discover.json'), 'utf8')).discover;
    expect(screen.getByText(ar.mobileTitle)).toBeTruthy();
    const arNative = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/discoverCommerceNative.json'), 'utf8')).discoverCommerceNative;
    fireEvent.press(screen.getByTestId('discover-search-open'));
    expect(screen.getByTestId('discover-search-input').props.placeholder).toBe(arNative.searchShort);
  });

  it('every discoverCommerceNative key exists in all 11 shards with the same placeholders as German', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat(JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'discoverCommerceNative.json'), 'utf8')));
    const de = read('de');
    expect(de.length).toBeGreaterThan(40);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
  });
});

describe('RTL-safe styles', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [
    ...files(join(APP, 'src/screens/discover')),
    ...files(join(APP, 'app/(app)/discover')).filter((f) => /(index|supplements|wellness-services|deals-offers|\[subcategory\])\.tsx$/.test(f)),
    join(APP, 'app/(app)/shop.tsx'),
    join(APP, 'src/ports/discover.tsx'),
    join(APP, 'src/ports/add-to-cart.ts'),
  ];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(25);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});

describe('route files', () => {
  it.each([
    ['discover/index.tsx', 'DiscoverScreen'],
    ['discover/supplements.tsx', 'SupplementsScreen'],
    ['discover/wellness-services.tsx', 'WellnessServicesScreen'],
    ['discover/deals-offers.tsx', 'DealsOffersScreen'],
    ['discover/category/[subcategory].tsx', 'CategoryProductsScreen'],
    ['shop.tsx', 'ShopFeedScreen'],
  ])('app/(app)/%s renders %s', (file, screenName) => {
    const src = readFileSync(join(APP, 'app/(app)', file), 'utf8');
    expect(src).toContain(`src/screens/discover/${screenName}`);
    expect(src).toMatch(/export default function/);
  });
});
