/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — the iOS IAP gate, tested both
 * ways (owner decision 4 / program decision 5: keep today's gate, never loosen).
 *
 * Today's native rule is `iapRestricted: Platform.OS === 'ios'` in the drawer
 * (src/shell/components/SideDrawer.tsx → src/shell/logic/drawer.ts, which
 * hides the Wallet row). The wallet screens apply the same rule through
 * `isIAPRestricted()` (src/screens/wallet-home/iap.ts) and mirror every web
 * `isIAPRestricted()` branch one-for-one:
 *  - src/pages/Wallet.tsx: iOS is redirected to /home; the balances block
 *    (cash + credits cards, quick actions) is hidden;
 *  - WalletMasterActionPopup: the "Transfer & convert" section is hidden;
 *  - MobileWalletQuickActions: add-funds / buy-credits / exchange / withdraw
 *    are filtered out (send stays);
 *  - AddFunds / BuyCredits / Withdraw / SpendCredits popups render nothing;
 *  - src/pages/wallet/Balance.tsx: `getContextualAction` returns null (no
 *    top-up / tokens / upgrade affordance); the membership tab stays visible.
 * Non-iOS (Android) shows all of them.
 */
import '../helpers/no-network';
import './mocks';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, mockParams } from './mocks';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider } from '../../src/ports/ui';
import { composeDrawerRows, type DrawerInput } from '../../src/shell/logic/drawer';
import { isIAPRestricted } from '../../src/screens/wallet-home/iap';
import { WalletScreen } from '../../src/screens/wallet-home/WalletScreen';
import { BalanceScreen } from '../../src/screens/wallet-home/BalanceScreen';
import { QuickActions } from '../../src/screens/wallet-home/components/QuickActions';
import { WalletFlowSheet, type WalletFlowKind } from '../../src/screens/wallet-home/components/WalletFlowSheet';
import { walletClient } from './fixtures';

const APP = join(__dirname, '../..');

function setOS(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  mockParams.current = {};
  jest.clearAllMocks();
});

function renderUI(ui: ReactElement) {
  const { client } = walletClient();
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  return render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client, language: 'de-DE' }) });
}

describe('today\'s native gate is unchanged', () => {
  const base: DrawerInput = { dbRole: 'community', isPatient: false, isPartnerOrgMember: false, iapRestricted: false, business: null };
  const ids = (over: Partial<DrawerInput>) => composeDrawerRows({ ...base, ...over }).map((r) => r.id);

  it('the drawer hides the Wallet row only when iapRestricted', () => {
    expect(ids({ iapRestricted: true })).not.toContain('wallet');
    expect(ids({ iapRestricted: false })).toContain('wallet');
  });

  it('the drawer still derives iapRestricted from Platform.OS === "ios"', () => {
    const src = readFileSync(join(APP, 'src/shell/components/SideDrawer.tsx'), 'utf8');
    expect(src).toContain("iapRestricted: Platform.OS === 'ios'");
  });

  it('isIAPRestricted() is the same rule: true on iOS, false on Android', () => {
    setOS('ios');
    expect(isIAPRestricted()).toBe(true);
    setOS('android');
    expect(isIAPRestricted()).toBe(false);
  });
});

describe('wallet hub /wallet', () => {
  it('iOS: redirects to /home and hides the balance cards and quick actions', async () => {
    setOS('ios');
    renderUI(<WalletScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(screen.getByTestId('wallet-balances')).toBeTruthy();
    expect(screen.queryByTestId('wallet-balance-cash')).toBeNull();
    expect(screen.queryByTestId('wallet-balance-credits')).toBeNull();
    expect(screen.queryByTestId('wallet-quick-actions')).toBeNull();
  });

  it('Android: no redirect; the balance cards and every quick action are shown', async () => {
    setOS('android');
    renderUI(<WalletScreen />);
    expect(await screen.findByTestId('wallet-balance-cash')).toBeTruthy();
    expect(screen.getByTestId('wallet-balance-credits')).toBeTruthy();
    for (const id of ['add-funds', 'send', 'exchange', 'withdraw', 'buy-credits']) expect(screen.getByTestId(`wallet-quick-${id}`)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalledWith('/home');
  });

  it('iOS: the activity list stays visible (only the purchase surfaces are gated)', async () => {
    setOS('ios');
    mockParams.current = { tab: 'activity' };
    renderUI(<WalletScreen />);
    expect(await screen.findByTestId('wallet-tx-tx-1')).toBeTruthy();
  });

  it('master action popup: the transfer & convert section is hidden on iOS, shown on Android', async () => {
    setOS('ios');
    const ios = renderUI(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-actions-button'));
    expect(await screen.findByTestId('wallet-master-popup')).toBeTruthy();
    expect(screen.queryByTestId('wallet-master-transfer')).toBeNull();
    ios.unmount();

    setOS('android');
    renderUI(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-actions-button'));
    expect(await screen.findByTestId('wallet-master-transfer')).toBeTruthy();
    for (const id of ['send', 'exchange', 'exchange-and-send']) expect(screen.getByTestId(`wallet-master-${id}`)).toBeTruthy();
  });
});

describe('quick actions (MobileWalletQuickActions)', () => {
  const noop = () => {};
  const props = { onAddFunds: noop, onSend: noop, onExchange: noop, onWithdraw: noop, onBuyCredits: noop };

  it('iOS keeps only send', () => {
    setOS('ios');
    renderUI(<QuickActions {...props} />);
    expect(screen.getByTestId('wallet-quick-send')).toBeTruthy();
    for (const id of ['add-funds', 'exchange', 'withdraw', 'buy-credits']) expect(screen.queryByTestId(`wallet-quick-${id}`)).toBeNull();
  });

  it('Android shows all five', () => {
    setOS('android');
    renderUI(<QuickActions {...props} />);
    for (const id of ['add-funds', 'send', 'exchange', 'withdraw', 'buy-credits']) expect(screen.getByTestId(`wallet-quick-${id}`)).toBeTruthy();
  });
});

describe('purchase popups (AddFunds / BuyCredits / Withdraw / SpendCredits)', () => {
  const gated: WalletFlowKind[] = ['add-funds', 'buy-credits', 'withdraw', 'spend-credits'];

  it.each(gated)('%s renders nothing on iOS', (kind) => {
    setOS('ios');
    renderUI(<WalletFlowSheet kind={kind} open onClose={() => {}} />);
    expect(screen.queryByTestId(`wallet-flow-${kind}`)).toBeNull();
  });

  it.each(gated)('%s renders on Android', async (kind) => {
    setOS('android');
    renderUI(<WalletFlowSheet kind={kind} open onClose={() => {}} />);
    expect(await screen.findByTestId(`wallet-flow-${kind}`)).toBeTruthy();
  });
});

describe('balance detail /wallet/balance', () => {
  it('iOS: no contextual top-up / tokens / upgrade action on any tab; the membership tab stays', () => {
    setOS('ios');
    for (const tab of ['credits', 'tokens', 'membership', 'optimization']) {
      mockParams.current = { tab };
      const r = renderUI(<BalanceScreen />);
      expect(screen.queryByTestId('balance-contextual-action')).toBeNull();
      expect(screen.getByTestId('balance-tab-membership')).toBeTruthy();
      r.unmount();
    }
  });

  it('Android: the contextual action follows the tab', () => {
    setOS('android');
    const expected: Record<string, string> = { credits: 'balance-topup', tokens: 'balance-tokens', membership: 'balance-upgrade', optimization: 'balance-topup' };
    for (const [tab, sheet] of Object.entries(expected)) {
      mockParams.current = { tab };
      const r = renderUI(<BalanceScreen />);
      fireEvent.press(screen.getByTestId('balance-contextual-action'));
      expect(screen.getByTestId(sheet)).toBeTruthy();
      r.unmount();
    }
  });
});
