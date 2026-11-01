/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — where the
 * subscriptions screens hand a billing write when the member confirms:
 * choose a plan, buy a credit pack, manage / withdraw (billing portal),
 * redeem a code.
 *
 * On the web these POST to the gateway (`/billing/checkout/subscription`,
 * `/billing/checkout/credits`, `/billing/portal`, `/billing/redeem`) and open
 * the hosted Stripe page. This lane makes no purchase, checkout or
 * subscription call (owner instruction for VTID-05425; same rule as the
 * sibling wallet-home lane's `WalletActions`), so the DEFAULT
 * `BillingActions` makes NO call: it tells the member to finish on the web
 * and resolves `null`. The CTAs themselves stay exactly where the web shows
 * them, on iOS too (no gate added — requirements R3.2).
 *
 * `gatewayBillingActions` is the web wire format, re-implemented on the
 * native gateway client. It is NOT wired anywhere in the app; the tests run
 * it against the fake gateway to pin the paths and payloads. Turning it on is
 * a later wallet FEAT behind owner decision 5 (iOS payments) and G1.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import { notify } from '../../../ports/ui';
import { gatewayJson } from '../../../ports/core';
import { getGateway } from '../../../auth/gateway';
import type { CheckoutResult, RedeemResult } from './billing';

export type PortalResult = { ok: true; url: string };

export type BillingActions = {
  startSubscriptionCheckout: (priceKey: string) => Promise<CheckoutResult | null>;
  startCreditsCheckout: (packKey: string) => Promise<CheckoutResult | null>;
  openPortal: () => Promise<PortalResult | null>;
  redeemCode: (code: string) => Promise<RedeemResult | null>;
};

const finishOnWeb = async () => {
  notify('walletSubscriptionsNative.finishOnWeb');
  return null;
};

/** The default: no call, a toast pointing to the web. */
export const deferredBillingActions: BillingActions = {
  startSubscriptionCheckout: finishOnWeb,
  startCreditsCheckout: finishOnWeb,
  openPortal: finishOnWeb,
  redeemCode: finishOnWeb,
};

function post<T>(path: string, body?: unknown): Promise<T> {
  return gatewayJson<T>(getGateway(), path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The web `billingApi.ts` writes on the native gateway client (not wired; see the header). */
export const gatewayBillingActions: BillingActions = {
  startSubscriptionCheckout: (priceKey) => post<CheckoutResult>('/billing/checkout/subscription', { price_key: priceKey }),
  startCreditsCheckout: (packKey) => post<CheckoutResult>('/billing/checkout/credits', { pack_key: packKey }),
  openPortal: () => post<PortalResult>('/billing/portal'),
  redeemCode: (code) => post<RedeemResult>('/billing/redeem', { code }),
};

const BillingActionsContext = createContext<BillingActions>(deferredBillingActions);

export function BillingActionsProvider({ value, children }: { value: BillingActions; children: ReactNode }): ReactElement {
  return createElement(BillingActionsContext.Provider, { value }, children);
}

export function useBillingActions(): BillingActions {
  return useContext(BillingActionsContext);
}
