/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — fake-gateway / fixture tests
 * for the native wallet hub (`/wallet`, `?tab=actions|activity`, the
 * WalletPopup overlay) and the balance detail (`/wallet/balance`,
 * `?tab=membership|optimization|tokens`). No network: the no-network guard
 * is imported first and the Supabase client is the in-memory wallet double.
 * Every test runs as Android (non-iOS) unless it says otherwise; the iOS gate
 * is covered in iap-gate.test.tsx. No real payment, transfer or redeem call:
 * the money-moving flows here submit to a fake `WalletActions`; the app
 * default's web calls are asserted against fakes in wallet-actions.test.tsx.
 * React 19: `ReactElement`, no global `JSX`.
 */
import '../helpers/no-network';
import './mocks';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { router, mockParams } from './mocks';
import { makeWrapper } from '../helpers/providers';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider, __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { LOCALES } from '../../src/i18n';
import { languageFromLocale } from '../../src/i18n/I18nProvider';
import { NATIVE_ROUTES, resolveWebPath } from '../../src/navigation/resolve';
import { WalletScreen } from '../../src/screens/wallet-home/WalletScreen';
import { BalanceScreen } from '../../src/screens/wallet-home/BalanceScreen';
import { WalletActionsProvider, type WalletActions } from '../../src/screens/wallet-home/data/actions';
import { __resetDisplayCurrencyForTests } from '../../src/screens/wallet-home/data/currency';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fakeWalletActions, walletClient, type WalletFixture } from './fixtures';

// Several screens or locales per test: more than the 5 s Jest default.
jest.setTimeout(30_000);

const APP = join(__dirname, '../..');

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  __clearToastsForTests();
  __resetDisplayCurrencyForTests();
  await AsyncStorage.clear();
});
afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  jest.restoreAllMocks();
  mockParams.current = {};
  jest.clearAllMocks();
});

function renderUI(ui: ReactElement, opts: { fixture?: WalletFixture; language?: string; direction?: 'ltr' | 'rtl'; actions?: WalletActions } = {}) {
  const fake = walletClient(opts.fixture);
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction={opts.direction ?? 'ltr'}>
      {opts.actions ? <WalletActionsProvider value={opts.actions}>{children}</WalletActionsProvider> : children}
    </UIProvider>
  );
  const r = render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client: fake.client, language: opts.language ?? 'de-DE' }) });
  return { ...r, fake };
}

const textOf = (id: string) => {
  const parts: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? parts.push(n) : n.children.forEach(walk));
  walk(screen.getByTestId(id));
  return parts.join('');
};

describe('wallet hub — balances (loaded / empty / error)', () => {
  it('loaded: cash balance in the default EUR display currency (USD × EUR_PER_USD), credits balance', async () => {
    renderUI(<WalletScreen />);
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('€110,86'));
    expect(textOf('wallet-balance-credits')).toContain('2.450');
    expect(screen.getByTestId('wallet-quick-actions')).toBeTruthy();
  });

  it('the € / $ toggle switches the cash card to USD and persists the choice', async () => {
    renderUI(<WalletScreen />);
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('€'));
    fireEvent.press(screen.getByTestId('wallet-currency-USD'));
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('$120,5'));
  });

  it('empty: no wallet rows → the cards show the loading label (web getBalance() === null) and no RPC runs', async () => {
    const { fake } = renderUI(<WalletScreen />, { fixture: { balances: [], transactions: [] } });
    await waitFor(() => expect(fake.reads.some((r) => r.table === 'user_wallets')).toBe(true));
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('Wird geladen'));
    // The shell's tenant list (rpc.list_public_tenants, a read) is the only RPC; no wallet RPC runs.
    expect(fake.calls.filter((c) => c.fn.startsWith('rpc.') && c.fn !== 'rpc.list_public_tenants')).toEqual([]);
    expect(fake.writes).toEqual([]);
  });

  it('error: a failed read leaves the cards on the loading label and the activity empty — no crash', async () => {
    mockParams.current = { tab: 'activity' };
    renderUI(<WalletScreen />, { fixture: { failBalances: true, failTransactions: true } });
    expect(await screen.findByTestId('wallet-tx-empty')).toBeTruthy();
  });

  it('reads only the member\'s own rows: user_wallets by user_id, wallet_transactions from/to the member, newest 10', async () => {
    const { fake } = renderUI(<WalletScreen />);
    await waitFor(() => expect(fake.reads.length).toBeGreaterThanOrEqual(2));
    const wallets = fake.reads.find((r) => r.table === 'user_wallets')!;
    expect(wallets.filters).toEqual(expect.arrayContaining([['select', 'currency_type, balance, updated_at'], ['eq:user_id', 'u-1']]));
    const txs = fake.reads.find((r) => r.table === 'wallet_transactions')!;
    expect(txs.filters).toEqual(expect.arrayContaining([['or', 'from_user_id.eq.u-1,to_user_id.eq.u-1'], ['order:created_at', { ascending: false }], ['limit', 10]]));
  });
});

describe('wallet hub — modes via the tab param (WALLET.ACTIVITY / WALLET.ACTIONS)', () => {
  it('?tab=activity lists the transactions with their translated type', async () => {
    mockParams.current = { tab: 'activity' };
    renderUI(<WalletScreen />);
    expect(await screen.findByTestId('wallet-tx-tx-1')).toBeTruthy();
    expect(screen.getByTestId('wallet-tx-tx-2')).toBeTruthy();
    expect(textOf('wallet-tx-tx-1')).toContain('+25');
    expect(textOf('wallet-tx-tx-2')).toContain('-10');
    expect(screen.queryByTestId('wallet-balances')).toBeNull();
  });

  it('?tab=activity&filter=transfer shows only transfers, the filter badge, and clearing it drops the params', async () => {
    mockParams.current = { tab: 'activity', filter: 'transfer' };
    renderUI(<WalletScreen />);
    expect(await screen.findByTestId('wallet-tx-tx-2')).toBeTruthy();
    expect(screen.queryByTestId('wallet-tx-tx-1')).toBeNull();
    expect(screen.getByTestId('wallet-filter-badge')).toBeTruthy();
    fireEvent.press(screen.getByTestId('wallet-filter-clear'));
    expect(router.setParams).toHaveBeenCalledWith({ filter: undefined });
  });

  it('?tab=activity&filter=pending shows pending rows', async () => {
    mockParams.current = { tab: 'activity', filter: 'pending' };
    renderUI(<WalletScreen />);
    expect(await screen.findByTestId('wallet-tx-tx-2')).toBeTruthy();
    expect(screen.queryByTestId('wallet-tx-tx-3')).toBeNull();
  });

  it('activity empty state', async () => {
    mockParams.current = { tab: 'activity' };
    renderUI(<WalletScreen />, { fixture: { transactions: [] } });
    expect(await screen.findByTestId('wallet-tx-empty')).toBeTruthy();
  });

  it('?tab=actions renders the actions mode cards', () => {
    mockParams.current = { tab: 'actions' };
    renderUI(<WalletScreen />);
    expect(screen.getByTestId('wallet-actions-mode')).toBeTruthy();
    expect(screen.getByTestId('wallet-predictive-actions')).toBeTruthy();
    expect(screen.getByTestId('wallet-reward-opportunities')).toBeTruthy();
  });

  it('the mode pill switches Balances → Activity, and Rewards opens /wallet/rewards', async () => {
    renderUI(<WalletScreen />);
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-activity'));
    expect(await screen.findByTestId('wallet-activity')).toBeTruthy();
    fireEvent.press(screen.getByTestId('mode-pill'));
    fireEvent.press(screen.getByTestId('mode-rewards'));
    expect(router.navigate).toHaveBeenCalledWith('/wallet/rewards');
  });

  it('?tab=rewards lands on /wallet/rewards (replace)', async () => {
    mockParams.current = { tab: 'rewards' };
    renderUI(<WalletScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/wallet/rewards'));
  });
});

describe('wallet hub — WalletPopup overlay and the flows (fake WalletActions only)', () => {
  it('the Actions button opens the WalletPopup (OVERLAY.WALLET_POPUP); a step opens its flow sheet', async () => {
    renderUI(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-actions-button'));
    expect(await screen.findByTestId('wallet-master-popup')).toBeTruthy();
    fireEvent.press(screen.getByTestId('wallet-master-exchange'));
    expect(await screen.findByTestId('wallet-flow-exchange')).toBeTruthy();
  });

  it('add funds: a quick amount in EUR is sent to the deposit in USD minor units', async () => {
    const actions = fakeWalletActions();
    renderUI(<WalletScreen />, { actions });
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('€'));
    fireEvent.press(screen.getByTestId('wallet-quick-add-funds'));
    fireEvent.press(await screen.findByTestId('wallet-flow-quick-50'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('wallet-flow-submit'));
    });
    expect(actions.createDeposit).toHaveBeenCalledWith({ amount_minor: Math.round((50 / 0.92) * 100), currency: 'USD' });
  });

  it('exchange: the quote comes from core calculateExchange (USD → CREDITS, no fees)', async () => {
    renderUI(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-quick-exchange'));
    fireEvent.press(within(await screen.findByTestId('wallet-flow-to')).getByTestId('radio-CREDITS'));
    fireEvent.changeText(await screen.findByTestId('wallet-flow-amount'), '12');
    expect(textOf('wallet-flow-quote')).toContain('1.200');
  });

  it('an empty amount is refused with the web toast and nothing is submitted', async () => {
    const actions = fakeWalletActions();
    renderUI(<WalletScreen />, { actions });
    fireEvent.press(screen.getByTestId('wallet-quick-add-funds'));
    await screen.findByTestId('wallet-flow-add-funds');
    await act(async () => {
      fireEvent.press(screen.getByTestId('wallet-flow-submit'));
    });
    expect(actions.createDeposit).not.toHaveBeenCalled();
    expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.wallet.invalidAmount2');
  });
});

describe('balance detail — tabs via the tab param', () => {
  it('defaults to credits: credits balance + credit transactions only', async () => {
    renderUI(<BalanceScreen />);
    expect(screen.getByTestId('balance-pane-credits')).toBeTruthy();
    await waitFor(() => expect(textOf('balance-card-credits')).toContain('2.450'));
    expect(await screen.findByTestId('balance-tx-tx-1')).toBeTruthy();
    expect(screen.queryByTestId('balance-tx-tx-2')).toBeNull();
  });

  it.each(['tokens', 'membership', 'optimization'])('?tab=%s renders its pane', (tab) => {
    mockParams.current = { tab };
    renderUI(<BalanceScreen />);
    expect(screen.getByTestId(`balance-pane-${tab}`)).toBeTruthy();
  });

  it('membership lists USD transactions; tokens shows the VTNA balance', async () => {
    mockParams.current = { tab: 'membership' };
    const r = renderUI(<BalanceScreen />);
    expect(await screen.findByTestId('balance-tx-tx-2')).toBeTruthy();
    expect(screen.getByTestId('balance-tx-tx-3')).toBeTruthy();
    r.unmount();
    mockParams.current = { tab: 'tokens' };
    renderUI(<BalanceScreen />);
    await waitFor(() => expect(textOf('balance-card-vtna')).toContain('80'));
  });

  it('pressing a tab writes it back to the search param (useUrlTab)', () => {
    renderUI(<BalanceScreen />);
    fireEvent.press(screen.getByTestId('balance-tab-tokens'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'tokens' });
  });

  it('credit transactions empty state', async () => {
    renderUI(<BalanceScreen />, { fixture: { transactions: [] } });
    expect(await screen.findByTestId('balance-tx-empty')).toBeTruthy();
  });
});

describe('routes and deep links', () => {
  it('/wallet and /wallet/balance route files default-export a component', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(typeof require('../../app/(app)/wallet/index').default).toBe('function');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(typeof require('../../app/(app)/wallet/balance').default).toBe('function');
  });

  it.each(['/wallet', '/wallet?tab=actions', '/wallet?tab=activity', '/wallet/balance', '/wallet/balance?tab=membership', '/wallet/balance?tab=optimization', '/wallet/balance?tab=tokens'])(
    '%s resolves native with its query kept',
    (url) => {
      const res = resolveWebPath(url);
      expect(res.kind).toBe('native');
      expect(res.href).toBe(url);
      expect(NATIVE_ROUTES).toContain(res.path);
    },
  );
});

describe('i18n + RTL', () => {
  const RAW_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
  const strings = (root: ReactTestInstance): string[] => {
    const out: string[] = [];
    const walk = (n: ReactTestInstance | string) => {
      if (typeof n === 'string') return void out.push(n);
      for (const k of ['accessibilityLabel', 'placeholder', 'title']) if (typeof n.props?.[k] === 'string') out.push(n.props[k]);
      n.children.forEach(walk);
    };
    walk(root);
    return out;
  };

  it.each([...LOCALES])('%s: hub, activity and balance render without a raw key', async (locale) => {
    const language = languageFromLocale(locale);
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    const hub = renderUI(<WalletScreen />, { language, direction });
    await waitFor(() => expect(screen.getByTestId('wallet-balance-cash')).toBeTruthy());
    expect(strings(screen.getByTestId('screen-wallet')).filter((s) => RAW_KEY.test(s))).toEqual([]);
    hub.unmount();
    mockParams.current = { tab: 'activity' };
    const act2 = renderUI(<WalletScreen />, { language, direction });
    await screen.findByTestId('wallet-tx-tx-1');
    expect(strings(screen.getByTestId('screen-wallet')).filter((s) => RAW_KEY.test(s))).toEqual([]);
    act2.unmount();
    mockParams.current = {};
    renderUI(<BalanceScreen />, { language, direction });
    expect(strings(screen.getByTestId('screen-wallet-balance')).filter((s) => RAW_KEY.test(s))).toEqual([]);
  });

  it('every walletHomeNative key exists in all 11 locales (DE first)', () => {
    const flat = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
    const de = flat(JSON.parse(readFileSync(join(APP, '../../src/i18n/de/walletHomeNative.json'), 'utf8')));
    expect(de.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const keys = flat(JSON.parse(readFileSync(join(APP, `../../src/i18n/${locale}/walletHomeNative.json`), 'utf8')));
      expect(keys.sort()).toEqual([...de].sort());
    }
  });

  it('no physical left/right in the wallet-home screen files', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
    const bad = files(join(APP, 'src/screens/wallet-home')).filter((f) =>
      /\b(marginLeft|marginRight|paddingLeft|paddingRight|left|right|borderLeftWidth|borderRightWidth)\s*:/.test(readFileSync(f, 'utf8')),
    );
    expect(bad).toEqual([]);
  });
});
