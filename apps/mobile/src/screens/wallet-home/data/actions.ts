/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — where the wallet flows hand
 * their request when the member confirms (add funds, buy credits, withdraw,
 * spend credits, send, request, exchange, exchange & send; the balance
 * top-up / tokens / upgrade sheets).
 *
 * On the web these call the Stripe deposit gateway (`useCreateDeposit`) or
 * the `update_user_balance` / `process_wallet_*` RPCs. This lane moves no
 * money (owner instruction for VTID-05422: no real payment, transfer or
 * redeem call; fixtures / fake gateway only), so the default `WalletActions`
 * makes NO call: it tells the member to finish the action in the web wallet.
 * Tests inject a fake through `WalletActionsProvider`; wiring a real gateway
 * is a later wallet FEAT behind owner decision 5 (iOS payments) and G1.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import { notify } from '../../../ports/ui';
import type { DisplayCurrency } from '../../../ports/wallet';

export type WalletActionKind =
  | 'add-funds'
  | 'buy-credits'
  | 'withdraw'
  | 'spend-credits'
  | 'send'
  | 'request'
  | 'exchange'
  | 'exchange-and-send'
  | 'top-up-credits'
  | 'buy-stake-tokens'
  | 'upgrade-membership';

export type WalletActionRequest = {
  kind: WalletActionKind;
  /** The amount as entered, in `currency` (credits for the credit flows). */
  amount?: number;
  currency?: DisplayCurrency | 'CREDITS';
  /** add-funds: the amount converted back to USD minor units (web `toMinorUnits(convertToUsd(...))`). */
  usdAmountMinor?: number;
};

export type WalletActions = { submit: (request: WalletActionRequest) => Promise<void> };

/** The default: no call, a toast pointing to the web wallet. */
export const deferredWalletActions: WalletActions = {
  submit: async () => {
    notify('walletHomeNative.flow.finishOnWeb');
  },
};

const WalletActionsContext = createContext<WalletActions>(deferredWalletActions);

export function WalletActionsProvider({ value, children }: { value: WalletActions; children: ReactNode }): ReactElement {
  return createElement(WalletActionsContext.Provider, { value }, children);
}

export function useWalletActions(): WalletActions {
  return useContext(WalletActionsContext);
}
