/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — the billing writes
 * the subscriptions screens make when the member confirms: choose a plan, buy
 * a credit pack, manage / withdraw (billing portal), redeem a code.
 *
 * `gatewayBillingActions` is the web `src/lib/billingApi.ts` on the native
 * gateway client: the same endpoints (`/billing/checkout/subscription`,
 * `/billing/checkout/credits`, `/billing/portal`, `/billing/redeem`), the same
 * JSON bodies. It is the app default. The screens open a returned hosted
 * Stripe URL in the in-app browser (`useOpenBillingUrl`, expo-web-browser),
 * where the web assigns `window.location`, and refresh billing/me on the
 * return (`useBillingReturnLeg`). The CTAs stay exactly where the web shows them, on iOS
 * too (no gate added — requirements R3.2).
 *
 * `BillingActionsProvider` lets a test inject its own actions; tests run
 * against the fake gateway only.
 */
import { createContext, createElement, useContext, type ReactElement, type ReactNode } from 'react';
import { gatewayJson } from '../../../ports/core';
import { getGateway } from '../../../auth/gateway';
import type { CheckoutResult, RedeemResult } from './billing';

export type PortalResult = { ok: true; url: string };

export type BillingActions = {
  startSubscriptionCheckout: (priceKey: string) => Promise<CheckoutResult>;
  startCreditsCheckout: (packKey: string) => Promise<CheckoutResult>;
  openPortal: () => Promise<PortalResult>;
  redeemCode: (code: string) => Promise<RedeemResult>;
};

function post<T>(path: string, body?: unknown): Promise<T> {
  return gatewayJson<T>(getGateway(), path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The web `billingApi.ts` writes on the native gateway client (the app default). */
export const gatewayBillingActions: BillingActions = {
  startSubscriptionCheckout: (priceKey) => post<CheckoutResult>('/billing/checkout/subscription', { price_key: priceKey }),
  startCreditsCheckout: (packKey) => post<CheckoutResult>('/billing/checkout/credits', { pack_key: packKey }),
  openPortal: () => post<PortalResult>('/billing/portal'),
  redeemCode: (code) => post<RedeemResult>('/billing/redeem', { code }),
};

const BillingActionsContext = createContext<BillingActions>(gatewayBillingActions);

export function BillingActionsProvider({ value, children }: { value: BillingActions; children: ReactNode }): ReactElement {
  return createElement(BillingActionsContext.Provider, { value }, children);
}

export function useBillingActions(): BillingActions {
  return useContext(BillingActionsContext);
}
