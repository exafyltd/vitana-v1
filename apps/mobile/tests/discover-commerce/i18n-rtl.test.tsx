/**
 * VTID-05511 — i18n + RTL for the marketplace-orders screens: every screen
 * renders with no unresolved catalog key in all 11 locales; every
 * `discoverCommerceNative.marketplaceOrders` key exists in all 11 shards with
 * German's placeholders; German is du-form; Arabic renders the Arabic
 * catalog; the lane's files use logical start/end only; route files are the
 * screen exports.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests } from '../../src/ports/ui';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { MarketplaceScreen } from '../../src/screens/marketplace-orders/MarketplaceScreen';
import { DoctorsCoachesScreen } from '../../src/screens/marketplace-orders/DoctorsCoachesScreen';
import { ProviderProfileScreen } from '../../src/screens/marketplace-orders/ProviderProfileScreen';
import { OrdersScreen } from '../../src/screens/marketplace-orders/OrdersScreen';
import { MyTicketsScreen } from '../../src/screens/marketplace-orders/MyTicketsScreen';
import { commerceWrapper, cjRow, intent, ticketRow, voucherRow, setOS } from './helpers';

// The 11-locale loop renders five screens per locale.
jest.setTimeout(30000);

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterEach(() => {
  searchParams.current = {};
  __clearToastsForTests();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});

const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;

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

const routes = {
  'GET /intent-board': (req: { query: URLSearchParams }) => ({ intents: req.query.get('kind') === 'commercial_sell' ? [intent()] : [] }),
  'GET /intents': { intents: [intent({ intent_id: 'm-1' })] } };
const tables = {
  bookmarked_items: [],
  provider_appointments: [],
  cj_orders: [cjRow()],
  event_ticket_purchases: [ticketRow()],
  voucher_orders: [voucherRow()],
  user_wallets: [],
};

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: the five screens, the booking dialog, the order sheet and the voucher modal render no unresolved key', async (locale) => {
    const restore = setOS('android');
    try {
      const { wrapper } = commerceWrapper(routes, { tables: tables as never }, languageFromLocale(locale));
      const check = (root: ReactTestInstance) => {
        const raw = allStrings(root).filter((s) => RAW_KEY.test(s.trim()));
        expect({ locale, raw }).toEqual({ locale, raw: [] });
      };

      let r = render(<MarketplaceScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId('marketplace-list-open')).toBeTruthy());
      fireEvent.press(screen.getByTestId('mo-intent-share-i-1'));
      fireEvent.press(screen.getByTestId('mo-gift-voucher'));
      check(r.root);
      r.unmount();

      r = render(<DoctorsCoachesScreen />, { wrapper });
      check(r.root);
      fireEvent.press(screen.getByTestId('doctors-tab-mine'));
      check(r.root);
      fireEvent.press(screen.getByTestId('doctors-tab-matches'));
      check(r.root);
      fireEvent.press(screen.getByTestId('doctors-tab-find'));
      fireEvent.press(screen.getByTestId('doctors-action'));
      check(r.root);
      fireEvent.press(screen.getByTestId('provider-book-1'));
      fireEvent.press(screen.getByTestId('booking-date'));
      check(r.root);
      r.unmount();

      searchParams.current = { id: '1' };
      r = render(<ProviderProfileScreen />, { wrapper });
      check(r.root);
      r.unmount();

      r = render(<OrdersScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId('order-card-t-up')).toBeTruthy());
      check(r.root);
      fireEvent.press(screen.getByTestId('order-card-t-up'));
      check(r.root);
      r.unmount();

      r = render(<MyTicketsScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId('ticket-card-t-up')).toBeTruthy());
      check(r.root);
      r.unmount();
      await act(async () => {
        await new Promise((res) => setTimeout(res, 0));
      });
    } finally {
      restore();
    }
  }, 60_000);

  it('Arabic (RTL) renders the orders screen with the Arabic catalog', async () => {
    const { wrapper } = commerceWrapper({}, { tables: tables as never }, 'ar-XA');
    render(<OrdersScreen />, { wrapper });
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/orders.json'), 'utf8')).orders;
    await waitFor(() => expect(screen.getByText(ar.myOrders)).toBeTruthy());
  });

  it('German renders the marketplace with the du-form catalog', async () => {
    searchParams.current = { view: 'mine' };
    const { wrapper } = commerceWrapper({ 'GET /intents': { intents: [] } }, {}, 'de-DE');
    render(<MarketplaceScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('marketplace-empty-mine')).toBeTruthy());
    expect(screen.getByText(/Poste eine Kauf- oder Verkaufsanfrage – der Matchmaker zeigt dir/)).toBeTruthy();
  });

  it('every marketplaceOrders key exists in all 11 shards with the same placeholders as German; German uses du, never Sie', () => {
    const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
    const read = (l: string) => flat((JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'discoverCommerceNative.json'), 'utf8')).discoverCommerceNative ?? {}).marketplaceOrders ?? {});
    const de = read('de');
    expect(de.length).toBeGreaterThan(90);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(read(l));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
    }
    for (const [k, v] of de) expect({ k, formal: /\b(Sie|Ihnen|Ihr|Ihre)\b/.test(v) }).toEqual({ k, formal: false });
  });
});

describe('RTL-safe styles + route files', () => {
  const files = (dir: string): string[] =>
    !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
  const laneFiles = [
    ...files(join(APP, 'src/screens/marketplace-orders')),
    join(APP, 'src/ports/marketplace-orders.tsx'),
    join(APP, 'app/(app)/discover/marketplace.tsx'),
    join(APP, 'app/(app)/discover/doctors-coaches.tsx'),
    join(APP, 'app/(app)/discover/orders.tsx'),
    join(APP, 'app/(app)/discover/provider/[id].tsx'),
    join(APP, 'app/(app)/my-tickets.tsx'),
  ];

  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(20);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });

  it.each([
    ['app/(app)/discover/marketplace.tsx', 'MarketplaceScreen'],
    ['app/(app)/discover/doctors-coaches.tsx', 'DoctorsCoachesScreen'],
    ['app/(app)/discover/provider/[id].tsx', 'ProviderProfileScreen'],
    ['app/(app)/discover/orders.tsx', 'OrdersScreen'],
    ['app/(app)/my-tickets.tsx', 'MyTicketsScreen'],
  ])('%s renders %s as its default export', (rel, name) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src).toContain(`src/screens/marketplace-orders/${name}`);
    expect(src).toMatch(/export default function/);
  });
});
