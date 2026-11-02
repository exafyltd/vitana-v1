/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — the route file in the
 * `(public)` group (plan decision 2a), the parity row, the iOS-IAP gates
 * exactly as today (requirements R3: `/redeem` ungated on iOS and Android;
 * the drawer's `iapRestricted` wallet gate unchanged, both ways), i18n in the
 * 11 locales (tasks.md wallet-redeem task 2) and RTL-safe styles.
 */
import '../helpers/no-network';
import { searchParams } from './mocks';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { composeDrawerRows, type DrawerInput } from '../../src/shell/logic/drawer';
import { RedeemScreen } from '../../src/screens/wallet-redeem/RedeemScreen';
import { TIERS } from '../../src/screens/wallet-redeem/tiers';
import { FAIL, order, redeemWrapper, voucher } from './helpers';

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterEach(() => {
  searchParams.current = {};
});

describe('route', () => {
  it('app/(public)/redeem.tsx renders RedeemScreen; no (app)/redeem.tsx', () => {
    const src = readFileSync(join(APP, 'app/(public)/redeem.tsx'), 'utf8');
    expect(src).toContain('src/screens/wallet-redeem/RedeemScreen');
    expect(src).toMatch(/export \{ RedeemScreen as default \}/);
    expect(existsSync(join(APP, 'app/(app)/redeem.tsx'))).toBe(false);
  });

  it('the (public) layout has no auth gate and no shell chrome', () => {
    const layout = readFileSync(join(APP, 'app/(public)/_layout.tsx'), 'utf8');
    expect(layout).toContain('headerShown: false');
    expect(layout).not.toMatch(/AuthGate|MobileAppShell|useAuth/);
  });

  it('/redeem resolves native and its ledger row is native', () => {
    expect(NATIVE_ROUTES).toContain('/redeem');
    expect(resolveWebPath('/redeem?voucher=GIFT-2026')).toMatchObject({ kind: 'native', path: '/redeem', query: 'voucher=GIFT-2026' });
    const ledger = JSON.parse(readFileSync(join(APP, 'parity/ledger.json'), 'utf8')) as { rows: Array<{ key: string; status: string; lane: string }> };
    expect(ledger.rows.find((r) => r.key === '/redeem')).toMatchObject({ status: 'native', lane: 'wallet' });
  });
});

describe('iOS IAP gates exactly as today', () => {
  const original = Platform.OS;
  const setOS = (os: 'ios' | 'android') => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  afterAll(() => setOS(original as 'ios' | 'android'));

  it.each([['ios'], ['android']] as const)('%s: /redeem is ungated — landing (signed out) and the claim button (signed in) both show', async (os) => {
    setOS(os);
    searchParams.current = { voucher: 'GIFT-2026' };
    const guest = redeemWrapper({ vouchers: [voucher()], orders: [order()] });
    const a = render(<RedeemScreen />, { wrapper: guest.wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(screen.getByTestId('redeem-sign-in')).toBeTruthy();
    a.unmount();

    const member = redeemWrapper({ vouchers: [voucher()], orders: [order()] }, { signedIn: true });
    render(<RedeemScreen />, { wrapper: member.wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-claim')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claimed')).toBeTruthy());
    expect(member.built.some((b) => b.op === 'update')).toBe(true);
  });

  it('the redeem files carry no IAP gate (web RedeemVoucher.tsx imports no isIAPRestricted)', () => {
    for (const f of laneFiles) expect({ f, gate: /iapRestricted|isIAPRestricted|isIOSApp|Platform\.OS/.test(readFileSync(f, 'utf8')) }).toEqual({ f, gate: false });
  });

  it('the drawer wallet gate is unchanged: hidden when iapRestricted, shown when not', () => {
    const base: DrawerInput = { dbRole: 'community', isPatient: false, isPartnerOrgMember: false, iapRestricted: false, business: null };
    const ids = (iapRestricted: boolean) => composeDrawerRows({ ...base, iapRestricted }).map((r) => r.id);
    expect(ids(true)).not.toContain('wallet');
    expect(ids(false)).toContain('wallet');
    expect(readFileSync(join(APP, 'src/shell/components/SideDrawer.tsx'), 'utf8')).toContain("iapRestricted: Platform.OS === 'ios'");
  });
});

/** A dotted catalog key that t() returned unresolved. */
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

const flat = (o: Record<string, unknown>, p = ''): Array<[string, string]> =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)] as [string, string]]));
const shard = (l: string, ns: string) => JSON.parse(readFileSync(join(REPO, 'src/i18n', l, `${ns}.json`), 'utf8'));

describe('i18n: all 11 locales', () => {
  it.each(LOCALES.map((l) => [l]))('%s: every state renders no unresolved key', async (locale) => {
    const language = languageFromLocale(locale);
    const raw: string[] = [];
    const collect = (root: ReactTestInstance) => raw.push(...allStrings(root).filter((s) => RAW_KEY.test(s.trim())));

    const cases: Array<{ params: Record<string, string>; db: Parameters<typeof redeemWrapper>[0]; signedIn?: boolean; id: string }> = [
      { params: {}, db: {}, id: 'redeem-invalid-link' },
      { params: { voucher: 'NOPE' }, db: { vouchers: [] }, id: 'redeem-not-found' },
      { params: { voucher: 'GIFT-2026' }, db: { vouchers: [voucher({ status: 'redeemed' })] }, id: 'redeem-already-redeemed' },
      { params: { voucher: 'GIFT-2026' }, db: { vouchers: [voucher({ expires_at: '2020-01-01T00:00:00Z' })] }, id: 'redeem-expired' },
      ...Object.keys(TIERS).map((tier) => ({ params: { voucher: 'GIFT-2026' }, db: { vouchers: [voucher({ tier })], orders: [order()] }, id: 'redeem-landing' })),
    ];
    for (const c of cases) {
      searchParams.current = c.params;
      const { wrapper } = redeemWrapper(c.db, { language, signedIn: c.signedIn });
      const r = render(<RedeemScreen />, { wrapper });
      await waitFor(() => expect(screen.getByTestId(c.id)).toBeTruthy());
      collect(r.root);
      r.unmount();
    }

    searchParams.current = { voucher: 'GIFT-2026' };
    const failing = redeemWrapper({ vouchers: [voucher()], orders: [order()], claim: FAIL }, { language, signedIn: true });
    const f = render(<RedeemScreen />, { wrapper: failing.wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claim-error')).toBeTruthy());
    expect(screen.getByText(shard(locale, 'walletRedeemNative').walletRedeemNative.claimFailed)).toBeTruthy();
    collect(f.root);
    f.unmount();

    const ok = redeemWrapper({ vouchers: [voucher()], orders: [] }, { language, signedIn: true });
    const s = render(<RedeemScreen />, { wrapper: ok.wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-confirm')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('redeem-claim')));
    await waitFor(() => expect(screen.getByTestId('redeem-claimed')).toBeTruthy());
    collect(s.root);
    s.unmount();

    expect({ locale, raw }).toEqual({ locale, raw: [] });
  }, 30_000);

  it('German: du-form claim message and the tier from the German catalog', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher({ tier: 'exclusive' })], orders: [order()] }, { language: 'de-DE' });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    const de = shard('de', 'walletRedeemNative').walletRedeemNative;
    expect(screen.getByTestId('redeem-tier-badge')).toHaveTextContent(de.tiers.exclusive.name);
    expect(screen.getByTestId('redeem-value')).toHaveTextContent(/49,00\s€/);
    expect(screen.getByText(shard('de', 'screens').screens.voucher.youVeReceivedGift)).toBeTruthy();
  });

  it('Arabic (RTL) renders the landing with the Arabic catalog', async () => {
    searchParams.current = { voucher: 'GIFT-2026' };
    const { wrapper } = redeemWrapper({ vouchers: [voucher()], orders: [order()] }, { language: 'ar-XA' });
    render(<RedeemScreen />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('redeem-landing')).toBeTruthy());
    expect(screen.getByText(shard('ar', 'screens').screens.voucher.youVeReceivedGift)).toBeTruthy();
    expect(screen.getByText(shard('ar', 'walletRedeemNative').walletRedeemNative.tiers.experience.benefit1)).toBeTruthy();
  });

  it('every walletRedeemNative key exists in all 11 shards with the same placeholders as German', () => {
    const de = flat(shard('de', 'walletRedeemNative'));
    expect(de.length).toBeGreaterThan(10);
    const ph = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort();
    for (const l of LOCALES) {
      const other = new Map(flat(shard(l, 'walletRedeemNative')));
      expect({ l, keys: [...other.keys()].sort() }).toEqual({ l, keys: de.map(([k]) => k).sort() });
      for (const [k, v] of de) {
        expect({ l, k, empty: !(other.get(k) ?? '').trim() }).toEqual({ l, k, empty: false });
        expect({ l, k, ph: ph(other.get(k) ?? '') }).toEqual({ l, k, ph: ph(v) });
      }
    }
  });

  it('English keeps the web’s hardcoded words exactly', () => {
    const en = shard('en', 'walletRedeemNative').walletRedeemNative;
    expect(en.claimFailed).toBe('Failed to claim voucher. It may have already been redeemed.');
    expect([en.tiers.test.name, en.tiers.experience.name, en.tiers.exclusive.name]).toEqual(['Test Voucher', 'Experience Voucher', 'Exclusive Voucher']);
    expect(en.wellnessFallback).toBe('wellness');
  });
});

const files = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : /\.tsx?$/.test(n) ? [join(dir, n)] : []));
const laneFiles = [...files(join(APP, 'src/screens/wallet-redeem')), join(APP, 'app/(public)/redeem.tsx'), join(APP, 'src/ports/wallet-redeem.tsx')];

describe('RTL-safe styles', () => {
  it('finds the lane files', () => {
    expect(laneFiles.length).toBeGreaterThanOrEqual(6);
  });

  it.each(laneFiles.map((f) => [f.slice(APP.length + 1)]))('%s uses start/end, never physical left/right', (rel) => {
    const src = readFileSync(join(APP, rel), 'utf8');
    expect(src.match(/\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:/g) ?? []).toEqual([]);
    expect(src.match(/textAlign:\s*'(left|right)'/g) ?? []).toEqual([]);
  });
});
