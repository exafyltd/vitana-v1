/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — where the reward shop's
 * confirm button hands its request (redeem an item / continue to the shipping
 * payment).
 *
 * On the web this is `redeemRewardItem` (POST /api/v1/rewards/shop/redeem),
 * which debits earned VTNA and, for a shipped item, returns a Stripe Checkout
 * URL. This lane makes no redeem, reward or payment call (owner instruction
 * for VTID-05424: fixtures / fake gateway only), so the default
 * `RewardShopActions` makes NO call: it tells the member to finish in the web
 * shop and returns `deferred`. Tests inject a fake through
 * `RewardShopActionsProvider`; wiring the real gateway is a later wallet FEAT
 * behind owner decision 5 (iOS payments) and G1.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import { notify } from '../../../ports/ui';
import type { RedeemRequest, RedeemResponse } from './rewards';

export type RedeemOutcome = RedeemResponse | { deferred: true };

export type RewardShopActions = { redeem: (request: RedeemRequest) => Promise<RedeemOutcome> };

/** The default: no call, a toast pointing to the web shop. */
export const deferredRewardShopActions: RewardShopActions = {
  redeem: async () => {
    notify('walletRewardsNative.shop.finishOnWeb');
    return { deferred: true };
  },
};

const RewardShopActionsContext = createContext<RewardShopActions>(deferredRewardShopActions);

export function RewardShopActionsProvider({ value, children }: { value: RewardShopActions; children: ReactNode }): ReactElement {
  return createElement(RewardShopActionsContext.Provider, { value }, children);
}

export function useRewardShopActions(): RewardShopActions {
  return useContext(RewardShopActionsContext);
}
