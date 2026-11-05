/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the iOS IAP gate on
 * /wallet/rewards, tested both ways (plan decision 3 / R3: keep today's gate,
 * no gate added, removed, widened or narrowed).
 *
 * Today on the web (src/pages/wallet/Rewards.tsx) the ONE `isIAPRestricted()`
 * branch of this surface is the page-level redirect:
 *   useEffect(() => { if (isIAPRestricted()) navigate('/home', { replace: true }) })
 * — the whole rewards page (earned, earn-more and the shop with its redeem /
 * shipping-payment affordance) is unreachable in the iPhone app; Android and
 * web show it. VtnaRewardRules, EarnMore and RewardShop carry no gate of their
 * own. Today's native rule is the drawer's `iapRestricted: Platform.OS ===
 * 'ios'` (src/shell/components/SideDrawer.tsx → src/shell/logic/drawer.ts,
 * which hides the Wallet row); the rewards screen applies the same rule
 * through `isIAPRestricted()` (src/screens/wallet-rewards/iap.ts).
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { Platform } from 'react-native';
import { screen, waitFor } from '@testing-library/react-native';
import { mockParams, router } from './mocks';
import { __setSupabaseForTests } from '../../src/auth/client';
import { composeDrawerRows, type DrawerInput } from '../../src/shell/logic/drawer';
import { isIAPRestricted } from '../../src/screens/wallet-rewards/iap';
import { RewardsScreen } from '../../src/screens/wallet-rewards/RewardsScreen';
import { renderWithProviders } from './fixtures';

const APP = join(__dirname, '../..');
const WEB = join(APP, '../../src');

function setOS(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  mockParams.current = {};
  jest.clearAllMocks();
});

describe("today's gate is unchanged", () => {
  const base: DrawerInput = { dbRole: 'community', isPatient: false, isPartnerOrgMember: false, iapRestricted: false, business: null };
  const ids = (over: Partial<DrawerInput>) => composeDrawerRows({ ...base, ...over }).map((r) => r.id);

  it('the drawer hides the Wallet row only when iapRestricted', () => {
    expect(ids({ iapRestricted: true })).not.toContain('wallet');
    expect(ids({ iapRestricted: false })).toContain('wallet');
  });

  it('the drawer still derives iapRestricted from Platform.OS === "ios"', () => {
    expect(readFileSync(join(APP, 'src/shell/components/SideDrawer.tsx'), 'utf8')).toContain("iapRestricted: Platform.OS === 'ios'");
  });

  it('isIAPRestricted() is the same rule: true on iOS, false on Android', () => {
    setOS('ios');
    expect(isIAPRestricted()).toBe(true);
    setOS('android');
    expect(isIAPRestricted()).toBe(false);
  });

  it('the web surface still has exactly one gate: the page-level redirect to /home in Rewards.tsx', () => {
    const page = readFileSync(join(WEB, 'pages/wallet/Rewards.tsx'), 'utf8');
    expect(page.match(/isIAPRestricted\(\)/g)).toHaveLength(1);
    expect(page).toMatch(/if \(isIAPRestricted\(\)\) \{\s*navigate\('\/home', \{ replace: true \}\);/);
    for (const f of ['components/wallet/VtnaRewardRules.tsx', 'components/wallet/EarnMore.tsx', 'components/wallet/RewardShop.tsx']) {
      expect(readFileSync(join(WEB, f), 'utf8')).not.toMatch(/isIAPRestricted|isIOSApp/);
    }
  });

  it('the native port mirrors it one-for-one: only RewardsScreen reads the gate, once', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
    const readers = files(join(APP, 'src/screens/wallet-rewards'))
      .filter((f) => !f.endsWith('iap.ts'))
      .filter((f) => /isIAPRestricted\(\)|Platform\.OS/.test(readFileSync(f, 'utf8')))
      .map((f) => f.split(/[\\/]/).pop());
    expect(readers).toEqual(['RewardsScreen.tsx']);
    expect(readFileSync(join(APP, 'src/screens/wallet-rewards/RewardsScreen.tsx'), 'utf8').match(/isIAPRestricted\(\)/g)).toHaveLength(1);
  });
});

describe('/wallet/rewards', () => {
  it.each(['earned', 'earn', 'shop'])('iOS (?tab=%s): redirects to /home with replace (web navigate replace)', async (tab) => {
    setOS('ios');
    mockParams.current = { tab };
    renderWithProviders(<RewardsScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(router.navigate).not.toHaveBeenCalledWith('/home');
  });

  it('Android: no redirect; the shop and its redeem affordance are shown', async () => {
    setOS('android');
    mockParams.current = { tab: 'shop' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('reward-shop-open-mug')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('Android: the earned and earn-more tabs are shown, no redirect', async () => {
    setOS('android');
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('vtna-reward-rules')).toBeTruthy();
    mockParams.current = { tab: 'earn' };
    renderWithProviders(<RewardsScreen />);
    expect(await screen.findByTestId('earn-more')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
