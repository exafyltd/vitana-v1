/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — iOS IAP parity:
 * the native subscriptions screens behave on iOS exactly as the web screens
 * do today (requirements R3.2 / plan decision 3: no gate added, removed,
 * widened or narrowed).
 *
 * Today's gating, read from the web sources on this branch:
 *  - `src/pages/wallet/Subscriptions.tsx`, `src/pages/MobileSubscriptions.tsx`
 *    and every `src/components/subscription/*` section they render carry NO
 *    `isIAPRestricted` / `isIOSApp` reference — they are ungated on iOS;
 *  - the only iOS IAP gate on the way to these screens natively is the
 *    drawer's Wallet row (`src/shell/logic/drawer.ts` `iapRestricted`, set to
 *    `Platform.OS === 'ios'` in SideDrawer.tsx), which this lane leaves as is.
 *
 * So the native twins must render the same tree on iOS and on Android
 * (purchase CTAs included), carry no platform branch, and the drawer rule
 * must still hide the Wallet row on iOS only. Fake gateway only: no
 * checkout, portal or subscription call is ever made.
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { composeDrawerRows, type DrawerInput } from '../../src/shell/logic/drawer';
import { SubscriptionsScreen } from '../../src/screens/wallet-subscriptions/SubscriptionsScreen';
import { ProfileSubscriptionsScreen } from '../../src/screens/wallet-subscriptions/ProfileSubscriptionsScreen';
import { foundingActive, freePlan, premiumActive, renderWithBilling } from './fixtures';

const APP = join(__dirname, '../..');
const REPO = join(APP, '../..');

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function setOS(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

/** Every testID rendered under the screen root, in tree order. */
function testIds(rootId: string): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { props?: { testID?: string }; children?: unknown[] };
    if (n.props?.testID) out.push(n.props.testID);
    for (const c of n.children ?? []) walk(c);
  };
  walk(screen.getByTestId(rootId));
  return out;
}

async function treeOn(os: 'ios' | 'android', ui: ReactElement, rootId: string, me = freePlan): Promise<string[]> {
  setOS(os);
  const r = renderWithBilling(ui, { me, founding: foundingActive });
  await screen.findByTestId('subs-plans-headline');
  await screen.findByTestId('subs-features');
  await act(async () => {});
  const ids = testIds(rootId);
  r.unmount();
  jest.restoreAllMocks();
  return ids;
}

/** The purchase / billing affordances the web shows on iOS today. */
const PURCHASE_CTAS = ['subs-plan-premium-choose', 'subs-pack-starter-buy', 'subs-pack-boost-buy', 'subs-pack-power-buy', 'subs-redeem-submit'];

describe('the web baseline: these surfaces are ungated today', () => {
  const webFiles = [
    'src/pages/wallet/Subscriptions.tsx',
    'src/pages/MobileSubscriptions.tsx',
    ...readdirSync(join(REPO, 'src/components/subscription'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
      .map((f) => `src/components/subscription/${f}`),
  ];

  it.each(webFiles)('%s has no isIAPRestricted / isIOSApp reference', (file) => {
    expect(readFileSync(join(REPO, file), 'utf8')).not.toMatch(/isIAPRestricted|isIOSApp|appilix/);
  });
});

describe('native twins: no platform branch (no gate added)', () => {
  const dir = join(APP, 'src/screens/wallet-subscriptions');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) files.push(full.slice(APP.length + 1));
    }
  };
  walk(dir);

  it('finds the lane files', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files)('%s reads no platform / IAP flag', (file) => {
    const text = readFileSync(join(APP, file), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(text).not.toMatch(/Platform\.OS|Platform\.select|isIAPRestricted|iapRestricted|isIOSApp/);
  });
});

describe('iOS renders exactly what Android renders (today\'s ungated behaviour)', () => {
  it('/wallet/subscriptions (free member): identical tree, purchase CTAs present on iOS', async () => {
    const ios = await treeOn('ios', <SubscriptionsScreen />, 'wallet-subscriptions');
    const android = await treeOn('android', <SubscriptionsScreen />, 'wallet-subscriptions');
    expect(ios).toEqual(android);
    for (const id of PURCHASE_CTAS) expect(ios).toContain(id);
    expect(ios).toContain('subs-plans-expanded-toggle');
  });

  it('/wallet/subscriptions (paid member): identical tree, Manage + Withdraw present on iOS', async () => {
    const ios = await treeOn('ios', <SubscriptionsScreen />, 'wallet-subscriptions', premiumActive);
    const android = await treeOn('android', <SubscriptionsScreen />, 'wallet-subscriptions', premiumActive);
    expect(ios).toEqual(android);
    expect(ios).toEqual(expect.arrayContaining(['subs-state-manage', 'subs-earnings-withdraw', 'subs-pack-boost-buy']));
  });

  it('/profile/subscriptions storefront (free + paid): identical trees on iOS and Android', async () => {
    for (const me of [freePlan, premiumActive]) {
      const ios = await treeOn('ios', <ProfileSubscriptionsScreen />, 'profile-subscriptions', me);
      const android = await treeOn('android', <ProfileSubscriptionsScreen />, 'profile-subscriptions', me);
      expect(ios).toEqual(android);
      expect(ios).toEqual(expect.arrayContaining(['subs-pack-power-buy', 'subs-plans-expanded-toggle']));
      if (me === freePlan) expect(ios).toEqual(expect.arrayContaining(['subs-plan-premium-choose', 'subs-redeem-submit']));
      else expect(ios).toEqual(expect.arrayContaining(['subs-state-manage', 'profile-subscriptions-manage']));
    }
  });
});

describe('the existing drawer gate is unchanged (not widened, not narrowed)', () => {
  const base: Omit<DrawerInput, 'iapRestricted'> = { dbRole: 'community', isPatient: false, isPartnerOrgMember: false, business: null };

  it('iOS (iapRestricted) hides the Wallet row; Android shows it', () => {
    expect(composeDrawerRows({ ...base, iapRestricted: true }).map((r) => r.id)).not.toContain('wallet');
    expect(composeDrawerRows({ ...base, iapRestricted: false }).map((r) => r.id)).toContain('wallet');
  });

  it('the drawer still derives the flag from Platform.OS === "ios"', () => {
    expect(readFileSync(join(APP, 'src/shell/components/SideDrawer.tsx'), 'utf8')).toContain("iapRestricted: Platform.OS === 'ios'");
  });
});
