/**
 * VTID-05422 fix 1 — the calls the SHIPPED wallet flows make (no
 * `WalletActionsProvider`: the app default `liveWalletActions`), asserted
 * against FAKES only: the fake gateway wallet rail (`walletGateway`), the
 * Supabase double (`walletClient`) and a mocked expo-web-browser. They must
 * be the web's requests (wallet-gateway-client.ts, useWallet.ts,
 * useMessages.ts, useActivityLogger.ts, useCommunityMembers.ts) with the
 * web popups' toasts, and the Stripe deposit must come back to the web's
 * result: open → close / AppState 'active' → deposit read → wallet refetch →
 * new balance + toast. No network (the guard is imported first); nothing
 * reaches a live system or Stripe. Runs as Android (the iOS gate is in
 * iap-gate.test.tsx, unchanged).
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement, ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { mockParams, router } from './mocks';
import { makeWrapper } from '../helpers/providers';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider, __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { WalletScreen } from '../../src/screens/wallet-home/WalletScreen';
import { BalanceScreen } from '../../src/screens/wallet-home/BalanceScreen';
import { WalletFlowSheet } from '../../src/screens/wallet-home/components/WalletFlowSheet';
import { WalletActionsProvider, WalletGatewayApiError, liveWalletActions, type WalletActions } from '../../src/screens/wallet-home/data/actions';
import { __resetPendingDepositForTests, getPendingDeposit } from '../../src/screens/wallet-home/data/flows';
import { __resetDisplayCurrencyForTests } from '../../src/screens/wallet-home/data/currency';
import { balances, fakeWalletActions, walletClient, walletGateway, type WalletFixture } from './fixtures';

// Several flows per test, and the web's 2 s simulated waits on the app default.
jest.setTimeout(30_000);

const openBrowser = WebBrowser.openBrowserAsync as jest.Mock;

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  __clearToastsForTests();
  __resetDisplayCurrencyForTests();
  __resetPendingDepositForTests();
  openBrowser.mockReset();
  openBrowser.mockResolvedValue({ type: 'cancel' });
  await AsyncStorage.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
afterEach(() => {
  jest.restoreAllMocks();
  mockParams.current = {};
  jest.clearAllMocks();
});

const toastKeys = () => __toastsForTests().map((t) => t.titleKey);

const textOf = (id: string) => {
  const parts: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? parts.push(n) : n.children.forEach(walk));
  walk(screen.getByTestId(id));
  return parts.join('');
};

function renderApp(ui: ReactElement, opts: { fixture?: WalletFixture; statuses?: string[]; actions?: WalletActions } = {}) {
  const fake = walletClient(opts.fixture);
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {opts.actions ? <WalletActionsProvider value={opts.actions}>{children}</WalletActionsProvider> : children}
    </UIProvider>
  );
  const wrapper = makeWrapper({ client: fake.client, language: 'en-US' });
  const gateway = walletGateway({ statuses: opts.statuses });
  __setGatewayForTests(gateway.fetch);
  const r = render(<Wrapped>{ui}</Wrapped>, { wrapper });
  return { ...r, fake, gateway };
}

async function openFlow(button: string, flow: string) {
  fireEvent.press(await screen.findByTestId(button));
  await screen.findByTestId(`wallet-flow-${flow}`);
}

async function confirm() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('wallet-flow-submit'));
  });
}

describe('request builders (liveWalletActions → fakes)', () => {
  function client() {
    const fake = walletClient();
    __setSupabaseForTests(fake.client);
    return fake;
  }

  it('deposit: POST /wallet/deposits/create {amount_minor, currency}, JSON + community role, answers the checkout', async () => {
    const gw = walletGateway();
    __setGatewayForTests(gw.fetch);
    await expect(liveWalletActions.createDeposit({ amount_minor: 5435, currency: 'USD' })).resolves.toEqual(expect.objectContaining({ deposit_id: 'dep_1', checkout_url: 'https://checkout.example.invalid/dep_1' }));
    expect(gw.calls).toEqual([
      { method: 'POST', path: '/wallet/deposits/create', headers: { 'content-type': 'application/json', 'x-vitana-active-role': 'community' }, body: { amount_minor: 5435, currency: 'USD' } },
    ]);
  });

  it('deposit status: GET /wallet/deposits/:id (encoded), no body', async () => {
    const gw = walletGateway({ statuses: ['processing'] });
    __setGatewayForTests(gw.fetch);
    await expect(liveWalletActions.getDeposit('dep/1')).resolves.toEqual({ ok: true, deposit: expect.objectContaining({ id: 'dep/1', status: 'processing' }) });
    expect(gw.calls).toEqual([{ method: 'GET', path: '/wallet/deposits/dep%2F1', headers: { 'x-vitana-active-role': 'community' }, body: undefined }]);
  });

  it('a non-2xx or { ok: false } answer throws WalletGatewayApiError with the gateway code', async () => {
    __setGatewayForTests(walletGateway({ createStatus: 200, createBody: { ok: false, error: 'amount_too_small' } }).fetch);
    await expect(liveWalletActions.createDeposit({ amount_minor: 1, currency: 'USD' })).rejects.toEqual(expect.objectContaining({ name: 'WalletGatewayApiError', code: 'amount_too_small' }));
    __setGatewayForTests(walletGateway({ createStatus: 500, createBody: {} }).fetch);
    const err = await liveWalletActions.createDeposit({ amount_minor: 1, currency: 'USD' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WalletGatewayApiError);
    expect((err as WalletGatewayApiError).code).toBe('http_500');
  });

  it('checkout: opened in the system browser; iOS resolves on close, Android resolves "opened"', async () => {
    openBrowser.mockResolvedValueOnce({ type: 'cancel' }).mockResolvedValueOnce({ type: 'opened' });
    await expect(liveWalletActions.openCheckout('https://checkout.example.invalid/dep_1')).resolves.toEqual({ closed: true });
    await expect(liveWalletActions.openCheckout('https://checkout.example.invalid/dep_1')).resolves.toEqual({ closed: false });
    expect(openBrowser).toHaveBeenCalledWith('https://checkout.example.invalid/dep_1');
  });

  it('the wallet RPCs carry the web parameter names', async () => {
    const fake = client();
    await liveWalletActions.updateBalance({ userId: 'u-1', currency: 'USD', amount: 102.5, operation: 'subtract', transactionType: 'withdrawal', description: 'Withdrawal via Debit Card' });
    await expect(liveWalletActions.exchangeCurrency({ userId: 'u-1', fromCurrency: 'USD', toCurrency: 'CREDITS', amount: 5, exchangeRate: 100 })).resolves.toEqual({ id: 'wtx-1', from_balance: 10, to_balance: 500 });
    await expect(liveWalletActions.transferFunds({ userId: 'u-1', toUserId: 'u-2', currency: 'CREDITS', amount: 10 })).resolves.toEqual({ id: 'wtx-1', fromBalance: 10, toBalance: 500 });
    expect(fake.rpcs()).toEqual([
      { fn: 'update_user_balance', args: { user_id_param: 'u-1', currency_param: 'USD', amount_param: 102.5, operation: 'subtract', p_transaction_type: 'withdrawal', p_description: 'Withdrawal via Debit Card' } },
      { fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'USD', p_to_currency: 'CREDITS', p_amount: 5, p_exchange_rate: 100 } },
      { fn: 'process_wallet_transfer', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_currency: 'CREDITS', p_amount: 10 } },
    ]);
  });

  it('an RPC error is thrown', async () => {
    const fake = walletClient({ failRpc: 'update_user_balance' });
    __setSupabaseForTests(fake.client);
    await expect(liveWalletActions.updateBalance({ userId: 'u-1', currency: 'USD', amount: 1, operation: 'subtract' })).rejects.toThrow('permission denied');
  });

  it('message, activity and member search are the web inserts / read', async () => {
    const fake = client();
    await liveWalletActions.sendMessage({ senderId: 'u-1', tenantId: 't-maxina', body: 'Payment request for $5', messageType: 'payment_request', contentData: { amount: 5 } });
    await liveWalletActions.logActivity({ userId: 'u-1', activityType: 'wallet.exchange', activityData: { amount: 5 }, dedupeKey: 'k' });
    await expect(liveWalletActions.searchMembers('Bo', 'u-1')).resolves.toEqual([{ user_id: 'u-2', display_name: 'Bojan', avatar_url: null }]);
    expect(fake.inserts).toEqual([
      {
        table: 'messages',
        values: [{ body: 'Payment request for $5', sender_id: 'u-1', recipient_id: null, thread_id: null, tenant_id: 't-maxina', message_type: 'payment_request', content_data: { amount: 5 }, workflow_type: null, action_buttons: null }],
      },
      { table: 'user_activity_log', values: expect.objectContaining({ user_id: 'u-1', activity_type: 'wallet.exchange', activity_data: { amount: 5 }, context_data: {}, dedupe_key: 'k', session_id: expect.any(String) }) },
    ]);
    expect(fake.searches[0]).toEqual([
      ['select', 'user_id, display_name, avatar_url'],
      ['eq:is_visible', true],
      ['ilike:display_name', '%Bo%'],
      ['order:display_name', { ascending: true }],
      ['limit', 20],
    ]);
  });
});

describe('the app default WalletActions make the web calls from the sheets', () => {
  it('buy credits: USD → CREDITS through process_wallet_exchange, then the web toasts', async () => {
    const onClose = jest.fn();
    const { fake } = renderApp(<WalletFlowSheet kind="buy-credits" open onClose={onClose} />);
    await waitFor(() => expect(textOf('wallet-flow-buy-credits')).toContain('2,450'));
    fireEvent.press(screen.getByTestId('wallet-flow-quick-500'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.creditsPurchasedSuccessfully'));
    expect(toastKeys()).toContain('toasts.hooks.exchangeCompleted');
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'USD', p_to_currency: 'CREDITS', p_amount: 5, p_exchange_rate: 100 } }]);
    // The web closes the popup after a purchase.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('withdraw: needs a method, then debits amount + fee through update_user_balance', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openFlow('wallet-quick-withdraw', 'withdraw');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-100'));
    await confirm();
    expect(toastKeys()).toContain('toasts.wallet.missingInformation');
    expect(fake.rpcs()).toEqual([]);
    fireEvent.press(screen.getByTestId('radio-debit_card'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.withdrawalInitiated2'), { timeout: 6000 });
    expect(fake.rpcs()).toEqual([
      { fn: 'update_user_balance', args: { user_id_param: 'u-1', currency_param: 'USD', amount_param: 102.5, operation: 'subtract', p_transaction_type: 'withdrawal', p_description: 'Withdrawal via Debit Card' } },
    ]);
  });

  it('withdraw: more than the USD balance is refused with the web toast', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openFlow('wallet-quick-withdraw', 'withdraw');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-250'));
    fireEvent.press(screen.getByTestId('radio-bank_transfer'));
    await confirm();
    expect(toastKeys()).toContain('toasts.wallet.insufficientBalance2');
    expect(fake.rpcs()).toEqual([]);
  });

  it('spend credits: a quick amount debits CREDITS as a named purchase', async () => {
    // The hub opens no spend sheet (as on the mobile web); the sheet is rendered on its own.
    const { fake } = renderApp(<WalletFlowSheet kind="spend-credits" open onClose={jest.fn()} />);
    await waitFor(() => expect(textOf('wallet-flow-spend-credits')).toContain('2,450'));
    fireEvent.press(screen.getByTestId('wallet-flow-quick-50'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.success'));
    expect(fake.rpcs()).toEqual([
      { fn: 'update_user_balance', args: { user_id_param: 'u-1', currency_param: 'CREDITS', amount_param: 50, operation: 'subtract', p_transaction_type: 'purchase', p_description: '50 Credits Purchase' } },
    ]);
  });

  it('exchange: process_wallet_exchange with the core rate; a failure shows the hook toast and keeps the sheet', async () => {
    const { fake } = renderApp(<WalletScreen />, { fixture: { failRpc: 'process_wallet_exchange' } });
    await openFlow('wallet-quick-exchange', 'exchange');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '12');
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.hooks.exchangeFailed'));
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'USD', p_to_currency: 'CREDITS', p_amount: 12, p_exchange_rate: 100 } }]);
    expect(screen.getByTestId('wallet-flow-exchange')).toBeTruthy();
  });

  it('send: search a member, transfer through process_wallet_transfer, then the payment_confirmation message', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openFlow('wallet-quick-send', 'send');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '10');
    fireEvent.changeText(screen.getByTestId('wallet-flow-description'), 'Lunch');
    await confirm();
    expect(toastKeys()).toContain('toasts.payment.noRecipientSelected');
    fireEvent.changeText(screen.getByTestId('wallet-flow-recipient-search'), 'Bo');
    fireEvent.press(await screen.findByTestId('wallet-flow-member-u-2'));
    expect(screen.queryByTestId('wallet-flow-member-u-3')).toBeNull();
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.payment.paymentSent'));
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_transfer', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_currency: 'CREDITS', p_amount: 10 } }]);
    expect(fake.inserts.filter((i) => i.table === 'messages')).toEqual([
      {
        table: 'messages',
        values: [
          expect.objectContaining({
            body: '💸 Payment sent: 10 credits - Lunch',
            sender_id: 'u-1',
            recipient_id: 'u-2',
            tenant_id: 't-maxina',
            message_type: 'payment_confirmation',
            content_data: { amount: 10, currency: 'CREDITS', description: 'Lunch', paymentType: 'transfer', status: 'completed' },
          }),
        ],
      },
    ]);
  });

  it('request: a payment_request message with the web action buttons and no recipient', async () => {
    // The hub opens no request sheet (as on the mobile web); the sheet is rendered on its own.
    const { fake } = renderApp(<WalletFlowSheet kind="request" open onClose={jest.fn()} />);
    await screen.findByTestId('wallet-flow-request');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '5');
    fireEvent.press(screen.getByTestId('radio-USD'));
    fireEvent.changeText(screen.getByTestId('wallet-flow-description'), 'Tickets');
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.payment.paymentRequestSent'));
    expect(fake.rpcs()).toEqual([]);
    expect(fake.inserts).toEqual([
      {
        table: 'messages',
        values: [
          expect.objectContaining({
            body: 'Payment request for $5',
            recipient_id: null,
            message_type: 'payment_request',
            content_data: { amount: 5, currency: 'USD', description: 'Tickets', dueDate: undefined, paymentType: 'transfer', requestedBy: 'current_user', status: 'pending' },
            action_buttons: [
              { label: 'Accept Payment', action: 'payment_accept', variant: 'default' },
              { label: 'Decline', action: 'payment_decline', variant: 'outline' },
            ],
          }),
        ],
      },
    ]);
  });

  it('exchange & send: the activity row and the exchange_and_send message (no RPC, as on the web)', async () => {
    const { fake } = renderApp(<WalletScreen />);
    fireEvent.press(screen.getByTestId('wallet-actions-button'));
    fireEvent.press(await screen.findByTestId('wallet-master-exchange-and-send'));
    await screen.findByTestId('wallet-flow-exchange-and-send');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '10');
    fireEvent.changeText(screen.getByTestId('wallet-flow-description'), 'Gift');
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.payment.exchangeSendCompleted'), { timeout: 6000 });
    expect(fake.rpcs()).toEqual([]);
    expect(fake.inserts.map((i) => i.table)).toEqual(['user_activity_log', 'messages']);
    expect(fake.inserts[1].values).toEqual([expect.objectContaining({ body: '💱➡ Exchange & Send: $10.00 → 1000 VTNA Credits - Gift', message_type: 'exchange_and_send', recipient_id: null })]);
  });
});

describe('Stripe deposit: checkout and the return leg', () => {
  /** Captures the AppState listeners the hub registers, to bring the app back to the foreground. */
  function captureAppState() {
    const listeners: Array<(s: AppStateStatus) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, cb) => {
      if (type === 'change') listeners.push(cb as (s: AppStateStatus) => void);
      return { remove: () => undefined } as never;
    });
    return { foreground: () => act(async () => listeners.forEach((l) => l('active'))) };
  }

  const credited = balances.map((b) => (b.currency_type === 'USD' ? { ...b, balance: 170.5 } : b));

  it('Android: open → AppState active → deposit read → wallet refetch → new balance + the web success toast', async () => {
    openBrowser.mockResolvedValue({ type: 'opened' });
    const app = captureAppState();
    const { gateway, fake } = renderApp(<WalletScreen />);
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('110.86'));
    await openFlow('wallet-quick-add-funds', 'add-funds');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-50'));
    await confirm();
    expect(toastKeys()).toContain('toasts.wallet.redirectingToCheckout');
    expect(openBrowser).toHaveBeenCalledWith('https://checkout.example.invalid/dep_1');
    expect(gateway.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /wallet/deposits/create']);
    expect(gateway.calls[0].body).toEqual({ amount_minor: Math.round((50 / 0.92) * 100), currency: 'USD' });
    expect(getPendingDeposit()).toBe('dep_1');

    // The webhook credited the wallet while the member was in the browser.
    fake.state.balances = credited;
    await app.foreground();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(gateway.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /wallet/deposits/create', 'GET /wallet/deposits/dep_1']);
    await waitFor(() => expect(textOf('wallet-balance-cash')).toContain('156.86'));
    expect(getPendingDeposit()).toBeNull();
  });

  it('iOS-style close: the return leg runs when the browser closes; a failed deposit shows the web failure toast', async () => {
    const { gateway } = renderApp(<WalletScreen />, { statuses: ['failed'] });
    await openFlow('wallet-quick-add-funds', 'add-funds');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-25'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.transactionFailed'));
    expect(gateway.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /wallet/deposits/create', 'GET /wallet/deposits/dep_1']);
  });

  it('webhook lag: pending reads are polled until the deposit settles', async () => {
    const actions = fakeWalletActions({
      getDeposit: jest
        .fn()
        .mockResolvedValueOnce({ ok: true, deposit: { id: 'dep_1', status: 'pending' } })
        .mockResolvedValueOnce({ ok: true, deposit: { id: 'dep_1', status: 'processing' } })
        .mockResolvedValue({ ok: true, deposit: { id: 'dep_1', status: 'succeeded' } }),
    });
    renderApp(<WalletScreen />, { actions });
    await openFlow('wallet-quick-add-funds', 'add-funds');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-25'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(actions.getDeposit).toHaveBeenCalledTimes(3);
    expect(actions.wait).toHaveBeenCalledWith(2500);
  });

  it('a canceled deposit shows the web depositCanceled toast; a create failure shows transactionFailed', async () => {
    const actions = fakeWalletActions({ getDeposit: jest.fn(async () => ({ ok: true, deposit: { id: 'dep_1', status: 'canceled' } })) as never });
    renderApp(<WalletScreen />, { actions });
    await openFlow('wallet-quick-add-funds', 'add-funds');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-25'));
    await confirm();
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.depositCanceled'));
    __clearToastsForTests();
    actions.createDeposit.mockRejectedValueOnce(new WalletGatewayApiError(500, 'http_500'));
    await openFlow('wallet-quick-add-funds', 'add-funds');
    fireEvent.press(screen.getByTestId('wallet-flow-quick-25'));
    await confirm();
    expect(toastKeys()).toContain('toasts.wallet.transactionFailed');
    expect(actions.openCheckout).toHaveBeenCalledTimes(1);
  });

  it('the web return params: ?depositResult=success reads the deposit and clears the params', async () => {
    mockParams.current = { depositId: 'dep_9', depositResult: 'success' };
    const { gateway } = renderApp(<WalletScreen />);
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.fundsAddedSuccessfully'));
    expect(gateway.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /wallet/deposits/dep_9']);
    expect(router.setParams).toHaveBeenCalledWith({ depositId: undefined, depositResult: undefined });
  });

  it('the web return params: ?depositResult=canceled shows depositCanceled with no call', async () => {
    mockParams.current = { depositId: 'dep_9', depositResult: 'canceled' };
    const { gateway } = renderApp(<WalletScreen />);
    await waitFor(() => expect(toastKeys()).toContain('toasts.wallet.depositCanceled'));
    expect(gateway.calls).toEqual([]);
    expect(router.setParams).toHaveBeenCalledWith({ depositId: undefined, depositResult: undefined });
  });
});

describe('balance detail dialogs', () => {
  it('their confirm buttons have no handler on the web, so they make no call', async () => {
    const actions = fakeWalletActions();
    const { fake, gateway } = renderApp(<BalanceScreen />, { actions });
    fireEvent.press(screen.getByTestId('balance-contextual-action'));
    fireEvent.press(await screen.findByTestId('balance-topup-confirm'));
    expect(Object.values(actions).every((fn) => fn.mock.calls.length === 0)).toBe(true);
    expect(fake.rpcs()).toEqual([]);
    expect(gateway.calls).toEqual([]);
    expect(toastKeys()).toEqual([]);
  });
});
