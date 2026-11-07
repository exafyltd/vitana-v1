/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) — i18n
 * and RTL for the commerce screens: each renders with no unresolved catalog
 * key in all 11 locales (product, cart with every section, the three success
 * screens), Arabic renders the Arabic catalog, the lane's new
 * `discoverCommerceNative.commerce.*` keys exist in all 11 shards with German's
 * placeholders and the registers (du / tu / você / ты), no hardcoded
 * user-visible literal in JSX, and the lane's files use start/end only.
 */
import '../helpers/no-network';
import { searchParams } from './discover-mocks';
import './timing';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { act, render, screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { ProductDetailScreen } from '../../src/screens/commerce/ProductDetailScreen';
import { UniversalCartScreen } from '../../src/screens/commerce/UniversalCartScreen';
import { CheckoutSuccessScreen } from '../../src/screens/commerce/CheckoutSuccessScreen';
import { TicketPurchaseSuccessScreen } from '../../src/screens/commerce/TicketPurchaseSuccessScreen';
import { PackagePurchaseSuccessScreen } from '../../src/screens/commerce/PackagePurchaseSuccessScreen';
import { discoverWrapper, flush, product, UUID } from './discover-helpers';

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

const ID = UUID(5);
const line = (n: number, metadata: Record<string, unknown>) => ({ id: `line-${n}`, cart_id: 'c1', item_type: 'partner_product', product_id: UUID(n), merchant_id: null, quantity: 1, unit_price_cents_snapshot: 1500, currency_snapshot: 'EUR', source_surface: 'community', source_ref: null, status: 'active', metadata, created_at: '', updated_at: '' });
const routes = {
  [`GET /discover/product/${ID}`]: {
    ok: true,
    product: product(5, { compare_at_price_cents: 4000, availability: 'out_of_stock', reward_preview: { points_estimate: 5 }, ingredients_primary: ['a'], health_goals: ['b'], dietary_tags: ['c'], dosage: '1', serving_size: '1', servings_per_container: 1, safety_notes: 's', evidence_links: [{ url: 'https://example.org', title: 'e' }], match_reasons: [{ kind: 'k', text: 't' }] }),
  },
  'GET /universal-cart': {
    ok: true,
    cart: { id: 'c1' },
    items: [line(1, {}), line(2, { origin: 'agent', rationale: 'r', safety_flags: ['f'], confidence: 0.5 }), line(3, { origin: 'reorder' }), line(4, { saved: true })],
  },
  'GET /universal-cart/budget': { ok: true, monthly_cap_cents: 1000, spent_this_month_cents: 900, cart_active_subtotal_cents: 500, currency: 'EUR', status: 'over' },
  'GET /wallet/balance': { ok: true, accounts: [] },
  'GET /wallet/deposits/dep-1': { ok: true, deposit: { id: 'dep-1', amount_minor: 100, currency: 'EUR', status: 'succeeded', failure_reason: null, created_at: '', updated_at: '' } },
  'GET /discover/my-recommendations': { ok: true, items: [] },
};
const tables = { event_ticket_purchases: [{ id: 'p-1', ticket_number: 'T1', buyer_email: 'a@g1-test.example.org', buyer_name: 'A', quantity: 1, qr_code_token: 'q', status: 'completed', ticket_type: null, event: null }] };

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

const SCREENS: Array<[string, () => ReactElement, Record<string, string>]> = [
  ['product', () => <ProductDetailScreen />, { id: ID }],
  ['cart', () => <UniversalCartScreen />, {}],
  ['checkout', () => <CheckoutSuccessScreen />, {}],
  ['deposit', () => <CheckoutSuccessScreen />, { deposit_id: 'dep-1' }],
  ['ticket', () => <TicketPurchaseSuccessScreen />, { purchase_id: 'p-1' }],
  ['ticket-invalid', () => <TicketPurchaseSuccessScreen />, {}],
  ['package-missing', () => <PackagePurchaseSuccessScreen />, {}],
];

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: every commerce screen renders no unresolved key', async (locale) => {
    for (const [name, el, params] of SCREENS) {
      searchParams.current = params;
      const { wrapper } = discoverWrapper(routes, { language: languageFromLocale(locale), tables: JSON.parse(JSON.stringify(tables)) });
      const r = render(el(), { wrapper });
      await act(async () => {
        await flush();
        await flush();
        await flush();
      });
      const raw = allStrings(r.root).filter((s) => RAW_KEY.test(s.trim()));
      expect({ locale, name, raw }).toEqual({ locale, name, raw: [] });
      r.unmount();
    }
  }, 60_000);

  it('Arabic (RTL) renders the cart with the Arabic catalog', async () => {
    const { wrapper } = discoverWrapper(routes, { language: 'ar-XA' });
    render(<UniversalCartScreen />, { wrapper });
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/universalCart.json'), 'utf8')).universalCart;
    expect(await screen.findByText(ar.page.subtitle)).toBeTruthy();
    expect(screen.getByText(ar.agent.sectionTitle)).toBeTruthy();
  });

  it('the commerce keys: DE first, all 11 shards, German placeholders, the registers', () => {
    const read = (l: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, 'discoverCommerceNative.json'), 'utf8')).discoverCommerceNative.commerce as Record<string, Record<string, string>>;
    const flat = (o: Record<string, Record<string, string>>) => Object.entries(o).flatMap(([g, v]) => Object.entries(v).map(([k, s]) => [`${g}.${k}`, s] as [string, string]));
    const de = flat(read('de'));
    expect(de.length).toBe(16);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(flat(read(l)));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) {
        expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
        expect({ l, k, empty: !(other.get(k) ?? '').trim() }).toEqual({ l, k, empty: false });
      }
    }
    const all = (l: string) => flat(read(l)).map(([, s]) => s).join(' \n ');
    expect(all('de')).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen|Ihren)\b/);
    expect(all('fr')).not.toMatch(/\b(vous|votre|vos)\b/i);
    expect(all('pt')).not.toMatch(/\b(teu|tua|teus|tuas)\b/i);
    expect(all('ru')).not.toMatch(/(^|[^а-яё])(вы|вас|ваш|ваша|ваше|вам)([^а-яё]|$)/i);
  });
});

const files = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
const laneFiles = [
  ...files(join(APP, 'src/screens/commerce')),
  join(APP, 'app/(app)/discover/product/[id].tsx'),
  join(APP, 'app/(app)/universal-cart.tsx'),
  join(APP, 'app/(app)/checkout/success.tsx'),
  join(APP, 'app/(app)/tickets/success.tsx'),
  join(APP, 'app/(app)/packages/success.tsx'),
  join(APP, 'src/ports/commerce.tsx'),
];

describe('RTL-safe styles and no hardcoded text', () => {
  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThan(18);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });

  it.each(laneFiles.filter((f) => f.endsWith('.tsx')).map((f) => [f.slice(APP.length + 1)]))('%s has no literal user-visible text in JSX', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    // text between a closing `>` and the next `<` / `{` that contains a letter
    const literal = [...src.matchAll(/(?<![=])>\s*([^<>{}\n]*[A-Za-zÀ-ž][^<>{}\n]*)\s*</g)].map((m) => m[1].trim()).filter((s) => !/^[=&|?:)(,;]/.test(s) && !/=>/.test(s));
    // the ticket pass's brand constants (VITANA, EVENT PASS, …) are tenant data, rendered from a constant, not JSX text
    expect(literal).toEqual([]);
    for (const attr of ['accessibilityLabel', 'placeholder', 'title']) expect(src.match(new RegExp(`${attr}="[^"]*[A-Za-z][^"]*"`, 'g')) ?? []).toEqual([]);
  });
});
