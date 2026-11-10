/**
 * VTID-05422 fix 2 — the WalletPopup (OVERLAY.WALLET_POPUP) steps make the
 * web WalletMasterActionPopup steps' calls, on the app default
 * `liveWalletActions` against FAKES only (the Supabase double, no network):
 *  - Exchange = web ExchangeStep: From / To selects, the swap control,
 *    seeded from the entry's `initialCurrency`, the core quote, the balance
 *    check on the from-currency, `process_wallet_exchange` with the pair;
 *  - Send = web SendStep: `process_wallet_transfer` + a `payment_sent`
 *    message (no step-level activity row);
 *  - Exchange & Send = web ExchangeAndSendStep: the
 *    `process_wallet_exchange_and_send` RPC (useWallet.exchangeAndSend) + an
 *    `exchange_and_send` message carrying both transaction ids.
 * Runs as Android (the iOS gate is in iap-gate.test.tsx, unchanged).
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { makeWrapper } from '../helpers/providers';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __setSupabaseForTests } from '../../src/auth/client';
import { UIProvider, __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { WalletScreen } from '../../src/screens/wallet-home/WalletScreen';
import * as flows from '../../src/screens/wallet-home/data/flows';
import { __resetDisplayCurrencyForTests } from '../../src/screens/wallet-home/data/currency';
import { balances, fakeWalletActions, walletClient, walletGateway, type WalletFixture } from './fixtures';

jest.setTimeout(30_000);

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  __clearToastsForTests();
  __resetDisplayCurrencyForTests();
  await AsyncStorage.clear();
});
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

const toasts = () => __toastsForTests().map((t) => t.titleKey);

const textOf = (id: string) => {
  const parts: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? parts.push(n) : n.children.forEach(walk));
  walk(screen.getByTestId(id));
  return parts.join('');
};

const isDisabled = (id: string) => !!screen.getByTestId(id).props.accessibilityState?.disabled;
const isChecked = (group: string, value: string) => !!within(screen.getByTestId(group)).getByTestId(`radio-${value}`).props.accessibilityState?.checked;
const pick = (group: string, value: string) => fireEvent.press(within(screen.getByTestId(group)).getByTestId(`radio-${value}`));

function renderApp(ui: ReactElement, fixture?: WalletFixture) {
  const fake = walletClient(fixture);
  __setGatewayForTests(walletGateway().fetch);
  const Wrapped = ({ children }: { children: ReactNode }) => (
    <UIProvider colorScheme="light" direction="ltr">
      {children}
    </UIProvider>
  );
  const r = render(<Wrapped>{ui}</Wrapped>, { wrapper: makeWrapper({ client: fake.client, language: 'en-US' }) });
  return { ...r, fake };
}

async function openMasterStep(step: 'send' | 'exchange' | 'exchange-and-send', sheet: string) {
  fireEvent.press(await screen.findByTestId('wallet-actions-button'));
  fireEvent.press(await screen.findByTestId(`wallet-master-${step}`));
  await screen.findByTestId(`wallet-flow-${sheet}`);
  // The balances have loaded (the step reads the from-currency balance).
  await waitFor(() => expect(textOf(`wallet-flow-${sheet}`)).toMatch(/Available: (2,450|120\.5)/));
}

async function confirm() {
  await act(async () => {
    fireEvent.press(screen.getByTestId('wallet-flow-submit'));
  });
}

describe('Exchange step (web ExchangeStep)', () => {
  it('CREDITS → USD: from the WalletPopup (no card currency) it starts on CREDITS; picking USD quotes 0.01 and sends the pair', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openMasterStep('exchange', 'exchange');
    expect(isChecked('wallet-flow-from', 'CREDITS')).toBe(true);
    pick('wallet-flow-to', 'USD');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '500');
    expect(textOf('wallet-flow-quote')).toContain('5.00 USD');
    expect(textOf('wallet-flow-quote')).toContain('1 CREDITS = 0.01 USD');
    await confirm();
    await waitFor(() => expect(toasts()).toContain('toasts.hooks.exchangeCompleted'));
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'CREDITS', p_to_currency: 'USD', p_amount: 500, p_exchange_rate: 0.01 } }]);
  });

  it('the quick action seeds the USD card currency; the balance check uses the from-currency', async () => {
    const { fake } = renderApp(<WalletScreen />);
    fireEvent.press(await screen.findByTestId('wallet-quick-exchange'));
    await screen.findByTestId('wallet-flow-exchange');
    await waitFor(() => expect(textOf('wallet-flow-exchange')).toContain('Available: 120.5USD'));
    expect(isChecked('wallet-flow-from', 'USD')).toBe(true);
    pick('wallet-flow-to', 'CREDITS');
    // 200 USD is more than the 120.50 USD balance: the web disables the exchange.
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '200');
    expect(isDisabled('wallet-flow-submit')).toBe(true);
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '12');
    expect(isDisabled('wallet-flow-submit')).toBe(false);
    await confirm();
    await waitFor(() => expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'USD', p_to_currency: 'CREDITS', p_amount: 12, p_exchange_rate: 100 } }]));
  });

  it('the swap control exchanges From and To; it is disabled while both are the same currency', async () => {
    const { fake } = renderApp(<WalletScreen />);
    fireEvent.press(await screen.findByTestId('wallet-quick-exchange'));
    await screen.findByTestId('wallet-flow-exchange');
    pick('wallet-flow-to', 'CREDITS');
    expect(isDisabled('wallet-flow-swap')).toBe(false);
    fireEvent.press(screen.getByTestId('wallet-flow-swap'));
    expect(isChecked('wallet-flow-from', 'CREDITS')).toBe(true);
    expect(isChecked('wallet-flow-to', 'USD')).toBe(true);
    await waitFor(() => expect(textOf('wallet-flow-exchange')).toContain('Available: 2,450CREDITS'));
    // From = To: no swap and no exchange (web `fromCurrency === toCurrency`).
    pick('wallet-flow-from', 'USD');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '10');
    expect(isDisabled('wallet-flow-swap')).toBe(true);
    expect(isDisabled('wallet-flow-submit')).toBe(true);
    // Swapped back to CREDITS → USD and confirmed.
    pick('wallet-flow-from', 'CREDITS');
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '100');
    await confirm();
    await waitFor(() => expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_exchange', args: { p_user_id: 'u-1', p_from_currency: 'CREDITS', p_to_currency: 'USD', p_amount: 100, p_exchange_rate: 0.01 } }]));
  });
});

describe('Send step (web SendStep)', () => {
  it('transfer, then a payment_sent message in the web body format; no step-level activity row', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openMasterStep('send', 'send-step');
    // Web CURRENCY_CONFIGS, CREDITS first selected.
    expect(isChecked('wallet-flow-currency', 'CREDITS')).toBe(true);
    expect(within(screen.getByTestId('wallet-flow-currency')).getByTestId('radio-USD')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('wallet-flow-recipient-search'), 'Bo');
    fireEvent.press(await screen.findByTestId('wallet-flow-member-u-2'));
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '10');
    fireEvent.changeText(screen.getByTestId('wallet-flow-description'), 'Lunch');
    await confirm();
    await waitFor(() => expect(fake.inserts.some((i) => i.table === 'messages')).toBe(true));
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_transfer', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_currency: 'CREDITS', p_amount: 10 } }]);
    expect(fake.inserts.filter((i) => i.table === 'messages')).toEqual([
      {
        table: 'messages',
        values: [
          expect.objectContaining({
            body: '💸 Payment sent: 10 CREDITS\n📝 Lunch',
            sender_id: 'u-1',
            recipient_id: 'u-2',
            tenant_id: 't-maxina',
            message_type: 'payment_sent',
            content_data: { type: 'transfer', amount: 10, currency: 'CREDITS', description: 'Lunch', recipientId: 'u-2' },
          }),
        ],
      },
    ]);
    // Only the transferFunds hook's own row (web useWallet), none from the step.
    expect(fake.inserts.filter((i) => i.table === 'user_activity_log').map((i) => (i.values as { dedupe_key: string }).dedupe_key)).toEqual(['transfer-wtx-1']);
    expect(toasts()).toContain('toasts.hooks.transferSuccessful');
    expect(toasts()).not.toContain('toasts.payment.paymentSent');
  });

  it('USD without a description: the body has no description line', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openMasterStep('send', 'send-step');
    pick('wallet-flow-currency', 'USD');
    fireEvent.changeText(screen.getByTestId('wallet-flow-recipient-search'), 'Bo');
    fireEvent.press(await screen.findByTestId('wallet-flow-member-u-2'));
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '5');
    await confirm();
    await waitFor(() => expect(fake.inserts.some((i) => i.table === 'messages')).toBe(true));
    expect(fake.rpcs()).toEqual([{ fn: 'process_wallet_transfer', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_currency: 'USD', p_amount: 5 } }]);
    expect((fake.inserts.find((i) => i.table === 'messages')!.values as Array<{ body: string }>)[0].body).toBe('💸 Payment sent: 5 USD');
  });

  it('the handler refuses a missing recipient / amount and a too-large amount with the web toasts', async () => {
    const actions = fakeWalletActions();
    const ctx = { actions, user: { id: 'u-1', tenantId: 't-maxina' }, balances, getBalance: (c: string) => balances.find((b) => b.currency_type === c)?.balance ?? null, refresh: jest.fn(async () => undefined) };
    const member = { user_id: 'u-2', display_name: 'Bojan', avatar_url: null };
    await expect(flows.submitSendStep(ctx, { amountText: '10', description: '', recipient: null, currency: 'CREDITS' })).resolves.toBe(false);
    expect(__toastsForTests().at(-1)).toEqual(expect.objectContaining({ titleKey: 'toasts.wallet.missingInformation', descKey: 'toasts.wallet.pleaseSelectRecipientEnterAmount' }));
    await expect(flows.submitSendStep(ctx, { amountText: '', description: '', recipient: member, currency: 'CREDITS' })).resolves.toBe(false);
    expect(toasts().at(-1)).toBe('toasts.wallet.missingInformation');
    await expect(flows.submitSendStep(ctx, { amountText: '200', description: '', recipient: member, currency: 'USD' })).resolves.toBe(false);
    expect(toasts().at(-1)).toBe('toasts.wallet.insufficientBalance2');
    expect(actions.transferFunds).not.toHaveBeenCalled();
    expect(actions.sendMessage).not.toHaveBeenCalled();
  });
});

describe('Exchange & Send step (web ExchangeAndSendStep)', () => {
  it('process_wallet_exchange_and_send with the useWallet p_ parameters, then the message with both transaction ids', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openMasterStep('exchange-and-send', 'exchange-and-send-step');
    expect(isChecked('wallet-flow-from', 'CREDITS')).toBe(true);
    expect(isChecked('wallet-flow-to', 'USD')).toBe(true);
    fireEvent.changeText(screen.getByTestId('wallet-flow-recipient-search'), 'Bo');
    fireEvent.press(await screen.findByTestId('wallet-flow-member-u-2'));
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '500');
    fireEvent.changeText(screen.getByTestId('wallet-flow-description'), 'Gift');
    expect(textOf('wallet-flow-quote')).toContain('5.00 USD');
    await confirm();
    await waitFor(() => expect(toasts()).toContain('toasts.wallet.exchangeSendComplete'));
    expect(toasts()).toContain('toasts.hooks.exchangeSendSuccessful');
    expect(fake.rpcs()).toEqual([
      { fn: 'process_wallet_exchange_and_send', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_from_currency: 'CREDITS', p_to_currency: 'USD', p_amount: 500, p_exchange_rate: 0.01 } },
    ]);
    expect(fake.inserts.filter((i) => i.table === 'messages')).toEqual([
      {
        table: 'messages',
        values: [
          expect.objectContaining({
            body: '💱➡ Exchange & Send completed: 500 CREDITS → 4.95 USD\n📝 Gift',
            recipient_id: 'u-2',
            message_type: 'exchange_and_send',
            content_data: {
              type: 'exchange_and_send',
              fromAmount: 500,
              fromCurrency: 'CREDITS',
              toAmount: 4.95,
              toCurrency: 'USD',
              description: 'Gift',
              recipientId: 'u-2',
              exchangeTransactionId: 'xtx-1',
              transferTransactionId: 'ttx-1',
            },
          }),
        ],
      },
    ]);
    // The hook's own exchange + transfer rows (web useWallet.exchangeAndSend).
    expect(fake.inserts.filter((i) => i.table === 'user_activity_log').map((i) => (i.values as { dedupe_key: string }).dedupe_key)).toEqual(['exchange-xtx-1', 'transfer-ttx-1']);
  });

  it('the balance check is the real from-currency balance (not a sample); the swap flips the pair', async () => {
    const { fake } = renderApp(<WalletScreen />);
    await openMasterStep('exchange-and-send', 'exchange-and-send-step');
    fireEvent.changeText(screen.getByTestId('wallet-flow-recipient-search'), 'Bo');
    fireEvent.press(await screen.findByTestId('wallet-flow-member-u-2'));
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '2500');
    expect(isDisabled('wallet-flow-submit')).toBe(true);
    fireEvent.press(screen.getByTestId('wallet-flow-swap'));
    expect(isChecked('wallet-flow-from', 'USD')).toBe(true);
    fireEvent.changeText(screen.getByTestId('wallet-flow-amount'), '100');
    await confirm();
    await waitFor(() =>
      expect(fake.rpcs()).toEqual([
        { fn: 'process_wallet_exchange_and_send', args: { p_from_user_id: 'u-1', p_to_user_id: 'u-2', p_from_currency: 'USD', p_to_currency: 'CREDITS', p_amount: 100, p_exchange_rate: 100 } },
      ]),
    );
  });

  it('the handler: web validation toasts, and an RPC failure shows the hook toast and sends no message', async () => {
    const actions = fakeWalletActions({ exchangeAndSend: jest.fn(async () => Promise.reject(new Error('permission denied'))) as never });
    const ctx = { actions, user: { id: 'u-1', tenantId: 't-maxina' }, balances, getBalance: (c: string) => balances.find((b) => b.currency_type === c)?.balance ?? null, refresh: jest.fn(async () => undefined) };
    const member = { user_id: 'u-2', display_name: 'Bojan', avatar_url: null };
    await expect(flows.submitExchangeAndSendStep(ctx, { amountText: '5', description: '', recipient: null, fromCurrency: 'CREDITS', toCurrency: 'USD' })).resolves.toBe(false);
    expect(toasts().at(-1)).toBe('toasts.wallet.missingInformation');
    await expect(flows.submitExchangeAndSendStep(ctx, { amountText: '3000', description: '', recipient: member, fromCurrency: 'CREDITS', toCurrency: 'USD' })).resolves.toBe(false);
    expect(toasts().at(-1)).toBe('toasts.wallet.insufficientBalance2');
    expect(actions.exchangeAndSend).not.toHaveBeenCalled();
    // The web closes the step after a failed RPC (the hook resolves null and raised its toast).
    await expect(flows.submitExchangeAndSendStep(ctx, { amountText: '5', description: '', recipient: member, fromCurrency: 'CREDITS', toCurrency: 'USD' })).resolves.toBe(true);
    expect(toasts()).toContain('toasts.hooks.exchangeSendFailed');
    expect(toasts()).not.toContain('toasts.wallet.exchangeSendComplete');
    expect(actions.sendMessage).not.toHaveBeenCalled();
  });
});
