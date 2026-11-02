/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — what each wallet flow does
 * when the member confirms, ported from the web popups: the same validation,
 * the same calls (./actions.ts) and the same toasts, in the same order.
 *   add-funds      AddFundsPopup + useCreateDeposit, and the Stripe return leg of Wallet.tsx
 *   buy-credits    BuyCreditsPopup (USD → CREDITS through process_wallet_exchange)
 *   withdraw       WithdrawPopup (update_user_balance subtract 'withdrawal')
 *   spend-credits  SpendCreditsPopup (update_user_balance subtract 'purchase')
 *   send           MakePaymentPopup (process_wallet_transfer + a payment_confirmation message)
 *   request        PaymentRequestPopup (a payment_request message)
 *   exchange       ExchangeStep (process_wallet_exchange)
 *   exchange-and-send  ExchangeAndSendPopup (activity + an exchange_and_send message; the web makes no RPC here)
 * The toasts the web hooks raise themselves (`toasts.hooks.*` in useWallet /
 * useMessages) are raised by the `*Hook` helpers below. A handler returns
 * true when the web closes the popup.
 *
 * Stripe deposit return leg (web Wallet.tsx `depositId` / `depositResult`):
 * the created deposit is marked pending; when the browser closes, on AppState
 * 'active' and on screen focus the hub calls `resumePendingDeposit`, which
 * reads `GET /wallet/deposits/:id` a few times (the webhook lags), refetches
 * the wallet balances + transactions and shows the web's toast: succeeded →
 * `fundsAddedSuccessfully`, failed → `transactionFailed`, canceled / expired
 * → `depositCanceled`. A deposit still pending after the short poll stays
 * pending for the next return to the app.
 */
import { notify, notifyError } from '../../../ports/ui';
import { calculateExchange, convertToUsd, formatCurrency, getExchangeRate, type DisplayCurrency } from '../../../ports/wallet';
import type { UserBalance, WalletCurrency } from './wallet';
import type { CommunityMember, UpdateBalanceInput, WalletActions } from './actions';

export type FlowUser = { id: string; tenantId: string } | null;

export type FlowContext = {
  actions: WalletActions;
  user: FlowUser;
  balances: UserBalance[];
  getBalance: (currency: WalletCurrency) => number | null;
  /** Refetch the wallet balances and transactions (web `fetchBalances` / `fetchTransactions`). */
  refresh: () => Promise<unknown>;
};

function requireUser(user: FlowUser): { id: string; tenantId: string } {
  if (!user) throw new Error('User not authenticated');
  return user;
}

// ── the useWallet / useMessages hook layer ────────────────────────────────

async function updateBalanceHook(ctx: FlowContext, input: Omit<UpdateBalanceInput, 'userId'>): Promise<unknown> {
  try {
    const data = await ctx.actions.updateBalance({ ...input, userId: requireUser(ctx.user).id });
    await ctx.refresh();
    return data;
  } catch (err) {
    notifyError('toasts.hooks.balanceUpdateFailed');
    throw err;
  }
}

async function exchangeCurrencyHook(ctx: FlowContext, fromCurrency: WalletCurrency, toCurrency: WalletCurrency, amount: number, exchangeRate: number) {
  try {
    const user = requireUser(ctx.user);
    const result = await ctx.actions.exchangeCurrency({ userId: user.id, fromCurrency, toCurrency, amount, exchangeRate });
    notify('toasts.hooks.exchangeCompleted');
    void ctx.actions.logActivity({
      userId: user.id,
      activityType: 'wallet.exchange',
      activityData: {
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
        exchange_rate: exchangeRate,
        converted_amount: amount * exchangeRate,
        transaction_id: result.id,
        new_from_balance: result.from_balance,
        new_to_balance: result.to_balance,
      },
      contextData: { transaction_id: result.id, from_currency: fromCurrency, to_currency: toCurrency },
      dedupeKey: `exchange-${result.id}`,
    });
    void ctx.refresh();
    return result;
  } catch (err) {
    notifyError('toasts.hooks.exchangeFailed');
    throw err;
  }
}

/** Web `transferFunds`: the success toast first, the failure toast on error, never throws. */
async function transferFundsHook(ctx: FlowContext, toUserId: string, currency: WalletCurrency, amount: number) {
  if (!ctx.user) return null;
  const user = ctx.user;
  notify('toasts.hooks.transferSuccessful');
  try {
    const result = await ctx.actions.transferFunds({ userId: user.id, toUserId, currency, amount });
    if (!result) return null;
    void ctx.actions.logActivity({
      userId: user.id,
      activityType: 'wallet.transfer',
      activityData: { amount, currency, to_user_id: `${toUserId.substring(0, 8)}...`, transaction_id: result.id, new_balance: result.fromBalance },
      contextData: { transaction_id: result.id, from_currency: currency, to_currency: currency },
      dedupeKey: `transfer-${result.id}`,
    });
    void ctx.refresh();
    return result;
  } catch {
    notifyError('toasts.hooks.transferFailed');
    void ctx.refresh();
    return null;
  }
}

async function sendMessageHook(ctx: FlowContext, body: string, recipientId: string | undefined, messageType: string, contentData?: unknown, actionButtons?: unknown[]) {
  try {
    const user = requireUser(ctx.user);
    await ctx.actions.sendMessage({ senderId: user.id, tenantId: user.tenantId, body, recipientId, messageType, contentData, actionButtons });
  } catch (err) {
    notifyError('toasts.hooks.error', 'toasts.hooks.failedSendMessage');
    throw err;
  }
}

// ── add funds + the Stripe return leg ─────────────────────────────────────

let pendingDepositId: string | null = null;
let resuming: Promise<void> | null = null;

/** Reads of the deposit after a return to the app, and the wait between them (web polls every 2.5 s). */
export const DEPOSIT_POLLS = 8;
export const DEPOSIT_POLL_MS = 2500;

export function setPendingDeposit(depositId: string): void {
  pendingDepositId = depositId;
}

export function getPendingDeposit(): string | null {
  return pendingDepositId;
}

export function __resetPendingDepositForTests(): void {
  pendingDepositId = null;
  resuming = null;
}

async function settlePendingDeposit(actions: WalletActions, refresh: () => Promise<unknown>): Promise<void> {
  const depositId = pendingDepositId;
  if (!depositId) return;
  for (let i = 0; i < DEPOSIT_POLLS; i++) {
    if (i > 0) await actions.wait(DEPOSIT_POLL_MS);
    let status: string;
    try {
      status = (await actions.getDeposit(depositId)).deposit.status;
    } catch {
      continue;
    }
    if (status === 'succeeded' || status === 'failed' || status === 'canceled' || status === 'expired') {
      if (pendingDepositId === depositId) pendingDepositId = null;
      if (status === 'succeeded') notify('toasts.wallet.fundsAddedSuccessfully');
      else if (status === 'failed') notifyError('toasts.wallet.transactionFailed');
      else notifyError('toasts.wallet.depositCanceled');
      await refresh();
      return;
    }
    await refresh();
  }
}

/** The return leg: runs when the browser closes, on AppState 'active' and on focus; one run at a time. */
export function resumePendingDeposit(actions: WalletActions, refresh: () => Promise<unknown>): Promise<void> {
  if (!pendingDepositId) return Promise.resolve();
  if (!resuming) {
    resuming = settlePendingDeposit(actions, refresh).finally(() => {
      resuming = null;
    });
  }
  return resuming;
}

export async function submitAddFunds(ctx: FlowContext, input: { amountText: string; displayCurrency: DisplayCurrency; eurPerUsd: number }): Promise<boolean> {
  if (!input.amountText || parseFloat(input.amountText) <= 0) {
    notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidAmountAdd');
    return false;
  }
  try {
    // Balances are stored in USD, so the deposit is always created in USD (web).
    const usdAmount = convertToUsd(parseFloat(input.amountText), input.displayCurrency, input.eurPerUsd);
    notify('toasts.wallet.redirectingToCheckout');
    const res = await ctx.actions.createDeposit({ amount_minor: Math.round(usdAmount * 100), currency: 'USD' });
    setPendingDeposit(res.deposit_id);
    const { closed } = await ctx.actions.openCheckout(res.checkout_url);
    if (closed) void resumePendingDeposit(ctx.actions, ctx.refresh);
    return true;
  } catch {
    notifyError('toasts.wallet.transactionFailed');
    return false;
  }
}

// ── buy / spend / withdraw / exchange ─────────────────────────────────────

export async function submitBuyCredits(ctx: FlowContext, input: { amountText: string }): Promise<boolean> {
  if (!input.amountText || parseFloat(input.amountText) <= 0) {
    notifyError('toasts.wallet.invalidAmount2', 'toasts.wallet.pleaseEnterValidNumberCredits');
    return false;
  }
  const creditPriceInUSD = getExchangeRate('CREDITS', 'USD')?.rate || 0.01;
  const usdToCreditsRate = getExchangeRate('USD', 'CREDITS')?.rate || 100;
  const cost = Math.round(parseFloat(input.amountText) * creditPriceInUSD * 100) / 100;
  if (cost > (ctx.getBalance('USD') || 0)) {
    notifyError('toasts.wallet.insufficientUsdBalance', 'toasts.wallet.youDonTHaveEnoughUsd');
    return false;
  }
  try {
    await exchangeCurrencyHook(ctx, 'USD', 'CREDITS', cost, usdToCreditsRate);
    notify('toasts.wallet.creditsPurchasedSuccessfully');
    return true;
  } catch {
    notifyError('toasts.wallet.purchaseFailed');
    return false;
  }
}

export type WithdrawalMethod = { id: 'bank_transfer' | 'debit_card'; name: string; fee: number; labelKey: string; timeKey: string };

/** Web WithdrawPopup `withdrawalMethods`; `name` is the text the web writes into the transaction description. */
export const WITHDRAWAL_METHODS: readonly WithdrawalMethod[] = [
  { id: 'bank_transfer', name: 'Bank Transfer', fee: 0, labelKey: 'walletHomeNative.flow.bankTransfer', timeKey: 'walletHomeNative.flow.bankTransferTime' },
  { id: 'debit_card', name: 'Debit Card', fee: 2.5, labelKey: 'walletHomeNative.flow.debitCard', timeKey: 'walletHomeNative.flow.debitCardTime' },
];

export async function submitWithdraw(ctx: FlowContext, input: { amountText: string; methodId: string | null }): Promise<boolean> {
  if (!input.amountText || !input.methodId) {
    notifyError('toasts.wallet.missingInformation', 'toasts.wallet.pleaseEnterAmountSelectWithdrawalMethod');
    return false;
  }
  const amount = parseFloat(input.amountText);
  const method = WITHDRAWAL_METHODS.find((m) => m.id === input.methodId);
  const totalCost = amount + (method?.fee || 0);
  if (amount <= 0) {
    notifyError('toasts.wallet.invalidAmount', 'toasts.wallet.pleaseEnterValidWithdrawalAmount');
    return false;
  }
  if (totalCost > (ctx.getBalance('USD') || 0)) {
    notifyError('toasts.wallet.insufficientBalance2');
    return false;
  }
  try {
    // The web simulates the processing for 2 s before the debit.
    await ctx.actions.wait(2000);
    await updateBalanceHook(ctx, { currency: 'USD', amount: totalCost, operation: 'subtract', transactionType: 'withdrawal', description: `Withdrawal via ${method?.name ?? input.methodId}` });
    notify('toasts.wallet.withdrawalInitiated2');
    return true;
  } catch {
    notifyError('toasts.wallet.withdrawalFailed', 'toasts.wallet.somethingWentWrongPleaseTryAgain');
    return false;
  }
}

export async function submitSpendCredits(ctx: FlowContext, input: { amountText: string; itemName: string | null }): Promise<boolean> {
  const amount = parseInt(input.amountText, 10);
  if (!amount || amount <= 0) {
    notifyError('toasts.wallet.error', 'toasts.wallet.pleaseEnterValidAmount');
    return false;
  }
  if (amount > (ctx.getBalance('CREDITS') || 0)) {
    notifyError('toasts.wallet.error', 'toasts.wallet.insufficientCreditsBalance');
    return false;
  }
  try {
    await updateBalanceHook(ctx, { currency: 'CREDITS', amount, operation: 'subtract', transactionType: 'purchase', description: input.itemName ?? 'Credits spent' });
    notify('toasts.wallet.success');
    return true;
  } catch {
    notifyError('toasts.wallet.error', 'toasts.wallet.failedProcessSpendingPleaseTryAgain');
    return false;
  }
}

export async function submitExchange(ctx: FlowContext, input: { amountText: string; fromCurrency: WalletCurrency; toCurrency: WalletCurrency }): Promise<boolean> {
  if (!input.amountText || parseFloat(input.amountText) <= 0) {
    notifyError('toasts.wallet.invalidAmount', 'toasts.wallet.pleaseEnterValidAmount');
    return false;
  }
  const amount = parseFloat(input.amountText);
  if (amount > (ctx.getBalance(input.fromCurrency) || 0)) {
    notifyError('toasts.wallet.insufficientBalance2');
    return false;
  }
  try {
    const rate = calculateExchange(amount, input.fromCurrency, input.toCurrency)?.rate || 1.0;
    await exchangeCurrencyHook(ctx, input.fromCurrency, input.toCurrency, amount, rate);
    return true;
  } catch {
    // The hook raised the toast (web ExchangeStep).
    return false;
  }
}

// ── send / request / exchange & send ──────────────────────────────────────

export type PaymentCurrency = 'CREDITS' | 'USD';

export async function submitSend(ctx: FlowContext, input: { amountText: string; description: string; recipient: CommunityMember | null; currency: PaymentCurrency }): Promise<boolean> {
  const { amountText: amount, description, recipient, currency } = input;
  if (!amount || !description) {
    notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
    return false;
  }
  if (!recipient) {
    notifyError('toasts.payment.noRecipientSelected', 'toasts.payment.pleaseSelectWhoSendPayment');
    return false;
  }
  const balance = ctx.balances.find((b) => b.currency_type === currency);
  if (!(balance ? balance.balance >= (parseFloat(amount) || 0) : false)) {
    notifyError('toasts.payment.insufficientBalance');
    return false;
  }
  try {
    const user = requireUser(ctx.user);
    // Web: transferFunds reports its own failure and resolves null; the popup carries on.
    await transferFundsHook(ctx, recipient.user_id, currency, parseFloat(amount));
    const name = recipient.display_name || 'Unknown User';
    await ctx.actions.logActivity({
      userId: user.id,
      activityType: 'wallet.transfer',
      activityData: { amount: parseFloat(amount), currency, recipient_id: recipient.user_id, recipient_name: name, description, paymentType: 'transfer' },
      dedupeKey: `wallet-transfer-${Date.now()}`,
    });
    await sendMessageHook(ctx, `💸 Payment sent: ${currency === 'CREDITS' ? `${amount} credits` : `$${amount}`} - ${description}`, recipient.user_id, 'payment_confirmation', {
      amount: parseFloat(amount),
      currency,
      description,
      paymentType: 'transfer',
      status: 'completed',
    });
    notify('toasts.payment.paymentSent');
    return true;
  } catch {
    notifyError('toasts.payment.paymentFailed', 'toasts.payment.failedProcessPaymentPleaseTryAgain');
    return false;
  }
}

export async function submitRequest(ctx: FlowContext, input: { amountText: string; description: string; currency: PaymentCurrency }): Promise<boolean> {
  const { amountText: amount, description, currency } = input;
  if (!amount || !description) {
    notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
    return false;
  }
  try {
    const paymentData = {
      amount: parseFloat(amount),
      currency,
      description,
      dueDate: undefined,
      paymentType: 'transfer',
      requestedBy: 'current_user',
      status: 'pending',
    };
    const actionButtons = [
      { label: 'Accept Payment', action: 'payment_accept', variant: 'default' },
      { label: 'Decline', action: 'payment_decline', variant: 'outline' },
    ];
    // Web: the body compares the upper-case currency with 'credits', so it always reads `$<amount>`.
    // The wallet opens the popup without a recipient, so recipient_id is null.
    await sendMessageHook(ctx, `Payment request for $${amount}`, undefined, 'payment_request', paymentData, actionButtons);
    notify('toasts.payment.paymentRequestSent');
    return true;
  } catch {
    notifyError('toasts.payment.error', 'toasts.payment.failedSendPaymentRequest');
    return false;
  }
}

/** Web ExchangeAndSendPopup checks the amount against this fixed balance, not the wallet. */
const EXCHANGE_AND_SEND_BALANCE: Record<string, number> = { USD: 2847.32, CREDITS: 1547 };

export async function submitExchangeAndSend(ctx: FlowContext, input: { amountText: string; description: string; fromCurrency?: PaymentCurrency; toCurrency?: PaymentCurrency }): Promise<boolean> {
  const { amountText: amount, description } = input;
  const fromCurrency = input.fromCurrency ?? 'USD';
  const toCurrency = input.toCurrency ?? 'CREDITS';
  if (!amount || !description) {
    notifyError('toasts.payment.missingInformation', 'toasts.payment.pleaseFillAmountDescription');
    return false;
  }
  if (!(EXCHANGE_AND_SEND_BALANCE[fromCurrency] >= (parseFloat(amount) || 0))) {
    notifyError('toasts.payment.insufficientBalance');
    return false;
  }
  const calculation = calculateExchange(parseFloat(amount) || 0, fromCurrency, toCurrency);
  if (!calculation) {
    notifyError('toasts.payment.exchangeError', 'toasts.payment.unableCalculateExchangeRate');
    return false;
  }
  try {
    // The web simulates the exchange + send for 2 s.
    await ctx.actions.wait(2000);
    const user = requireUser(ctx.user);
    const exchangeData = {
      originalAmount: calculation.fromAmount,
      originalCurrency: fromCurrency,
      exchangedAmount: calculation.total,
      exchangedCurrency: toCurrency,
      exchangeRate: calculation.rate,
      fees: calculation.fees,
      description,
      recipient: 'Recipient',
      transactionId: `EXS_${Date.now()}`,
      type: 'exchange_and_send',
    };
    await ctx.actions.logActivity({
      userId: user.id,
      activityType: 'wallet.exchange',
      activityData: {
        from_amount: calculation.fromAmount,
        from_currency: fromCurrency,
        to_amount: calculation.total,
        to_currency: toCurrency,
        exchange_rate: calculation.rate,
        fees: calculation.fees,
      },
      dedupeKey: `wallet-exchange-${Date.now()}`,
    });
    await sendMessageHook(
      ctx,
      `💱➡ Exchange & Send: ${formatCurrency(calculation.fromAmount, fromCurrency)} → ${formatCurrency(calculation.total, toCurrency)} - ${description}`,
      undefined,
      'exchange_and_send',
      exchangeData,
    );
    notify('toasts.payment.exchangeSendCompleted');
    return true;
  } catch {
    notifyError('toasts.payment.transactionFailed', 'toasts.payment.pleaseTryAgainContactSupport');
    return false;
  }
}
