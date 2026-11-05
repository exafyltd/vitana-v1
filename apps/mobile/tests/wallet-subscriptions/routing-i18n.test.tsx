/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — routing, parity
 * rows, i18n and RTL for the two subscriptions screens (tasks 2–5).
 *  - `/wallet/subscriptions` and `/profile/subscriptions` resolve natively,
 *    and the `/profile/subscriptions` route renders the storefront (the web
 *    mobile branch of `ProfileSubscriptionsRouter`), never the desktop
 *    redirect to `/wallet/subscriptions`;
 *  - both ledger rows are `native`;
 *  - the lane catalog exists in all 11 locales with the same keys as German,
 *    every rendered string resolves (no raw catalog key on screen) in every
 *    locale, and Arabic renders under the RTL provider.
 */
import '../helpers/no-network';
import './mocks';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { act, screen } from '@testing-library/react-native';
import { router } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { resolveWebPath } from '../../src/navigation/resolve';
import { LOCALES } from '../../src/i18n';
import { SubscriptionsScreen } from '../../src/screens/wallet-subscriptions/SubscriptionsScreen';
import { ProfileSubscriptionsScreen } from '../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';
import ProfileSubscriptionsRoute from '../../app/(app)/profile/subscriptions';
import WalletSubscriptionsRoute from '../../app/(app)/wallet/subscriptions';
import { foundingActive, premiumActive, renderWithBilling } from './fixtures';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('routing', () => {
  it.each(['/wallet/subscriptions', '/profile/subscriptions'])('%s resolves to its native route', (path) => {
    expect(resolveWebPath(path)).toEqual(expect.objectContaining({ kind: 'native', href: path }));
  });

  it('a redeem deep link keeps its query', () => {
    expect(resolveWebPath('/wallet/subscriptions?code=ABCD').href).toBe('/wallet/subscriptions?code=ABCD');
  });

  it('/profile/subscriptions renders the MobileSubscriptions storefront, not the desktop redirect', async () => {
    renderWithBilling(<ProfileSubscriptionsRoute />, { actions: 'app' });
    expect(screen.getByTestId('profile-subscriptions')).toBeTruthy();
    await screen.findByTestId('subs-state-free');
    expect(screen.queryByTestId('wallet-subscriptions')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('/wallet/subscriptions renders the overview', async () => {
    renderWithBilling(<WalletSubscriptionsRoute />, { actions: 'app' });
    expect(screen.getByTestId('wallet-subscriptions')).toBeTruthy();
    await screen.findByTestId('subs-promises');
  });
});

describe('parity ledger', () => {
  const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; lane: string }> };
  it.each(['WALLET.SUBSCRIPTIONS', '/profile/subscriptions'])('%s is native', (key) => {
    expect(ledger.rows.find((r) => r.key === key)).toEqual(expect.objectContaining({ status: 'native', lane: 'wallet' }));
  });
});

type Tree = { [k: string]: string | Tree };
const flatKeys = (o: Tree, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [`${p}${k}`] : flatKeys(v, `${p}${k}.`)));

describe('i18n catalog walletSubscriptionsNative', () => {
  const shard = (l: string) => join(REPO, 'src/i18n', l, 'walletSubscriptionsNative.json');
  const de = flatKeys(JSON.parse(readFileSync(shard('de'), 'utf8')));

  it('covers the 11 locales', () => {
    expect([...LOCALES].sort()).toEqual(['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh']);
  });

  it.each([...LOCALES])('%s has the German key set, every value non-empty', (l) => {
    expect(existsSync(shard(l))).toBe(true);
    const tree = JSON.parse(readFileSync(shard(l), 'utf8')) as Tree;
    expect(flatKeys(tree).sort()).toEqual([...de].sort());
    const values = flatKeys(tree).map((k) => k.split('.').reduce<unknown>((o, part) => (o as Tree)[part], tree));
    for (const v of values) expect(typeof v === 'string' && v.trim().length > 0).toBe(true);
  });
});

/** Every Text string rendered under the screen root. */
function renderedStrings(rootId: string): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') out.push(node);
    else if (node && typeof node === 'object') for (const c of (node as { children?: unknown[] }).children ?? []) walk(c);
  };
  walk(screen.getByTestId(rootId));
  return out;
}

const RAW_KEY = /^(billing|walletSubscriptionsNative|common)\.[A-Za-z0-9_.]+$/;

describe('no raw catalog key on screen, in every locale', () => {
  const LANG: Record<string, string> = { de: 'de-DE', en: 'en-US', es: 'es-ES', fr: 'fr-FR', pl: 'pl-PL', pt: 'pt-BR', ru: 'ru-RU', sr: 'sr-RS', tr: 'tr-TR', zh: 'zh-CN', ar: 'ar-XA' };

  it.each(Object.keys(LANG))('%s: overview + storefront resolve every string', async (l) => {
    for (const [ui, root] of [
      [<SubscriptionsScreen key="o" />, 'wallet-subscriptions'],
      [<ProfileSubscriptionsScreen key="s" />, 'profile-subscriptions'],
    ] as const) {
      const r = renderWithBilling(ui, { me: premiumActive, founding: foundingActive, language: LANG[l], direction: l === 'ar' ? 'rtl' : 'ltr' });
      await screen.findByTestId('subs-features');
      await act(async () => {});
      const strings = renderedStrings(root);
      expect(strings.length).toBeGreaterThan(20);
      expect(strings.filter((s) => RAW_KEY.test(s.trim()))).toEqual([]);
      r.unmount();
    }
  });

  it('Arabic: the storefront renders under the RTL provider with Arabic copy', async () => {
    renderWithBilling(<ProfileSubscriptionsScreen />, { me: premiumActive, language: 'ar-XA', direction: 'rtl' });
    await screen.findByTestId('subs-features');
    const ar = JSON.parse(readFileSync(join(REPO, 'src/i18n/ar/billing.json'), 'utf8')).billing;
    expect(screen.getByText(ar.state.premiumActive)).toBeTruthy();
  });
});

describe('RTL-safe styles', () => {
  it('no physical left/right in the lane files (logical start/end only)', () => {
    const files = [
      'src/screens/wallet-subscriptions/SubscriptionsScreen.tsx',
      'src/screens/wallet-subscriptions/ProfileSubscriptionsScreen.tsx',
      'src/screens/wallet-subscriptions/components/Banners.tsx',
      'src/screens/wallet-subscriptions/components/Frame.tsx',
      'src/screens/wallet-subscriptions/components/IntervalToggle.tsx',
      'src/screens/wallet-subscriptions/components/PlanState.tsx',
      'src/screens/wallet-subscriptions/components/Plans.tsx',
      'src/screens/wallet-subscriptions/components/RedeemCodeCard.tsx',
      'src/ports/billing.tsx',
    ];
    const re = /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:|textAlign:\s*'(left|right)'/g;
    const offenders = files.flatMap((f) => [...readFileSync(join(APP, f), 'utf8').matchAll(re)].map((m) => `${f}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });
});
