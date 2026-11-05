/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — where the reward shop's
 * confirm button hands its request (redeem an item / continue to the shipping
 * payment).
 *
 * The default is the web `redeemRewardItem` (./rewards.ts, POST
 * /api/v1/rewards/shop/redeem), which debits earned VTNA and, for a shipped
 * item, returns a Stripe Checkout URL. Tests inject a fake through
 * `RewardShopActionsProvider` or run the default against a fake fetch; no test
 * calls a live system.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import { redeemRewardItem, type RedeemRequest, type RedeemResponse } from './rewards';

export type RewardShopActions = { redeem: (request: RedeemRequest) => Promise<RedeemResponse> };

export const gatewayRewardShopActions: RewardShopActions = { redeem: redeemRewardItem };

const RewardShopActionsContext = createContext<RewardShopActions>(gatewayRewardShopActions);

export function RewardShopActionsProvider({ value, children }: { value: RewardShopActions; children: ReactNode }): ReactElement {
  return createElement(RewardShopActionsContext.Provider, { value }, children);
}

export function useRewardShopActions(): RewardShopActions {
  return useContext(RewardShopActionsContext);
}
