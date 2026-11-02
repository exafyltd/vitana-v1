/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — native twins of the
 * web billing hooks (`src/hooks/useBilling.ts` over `src/lib/billingApi.ts`)
 * and of the founding-status read in `FoundingBanner.tsx`. Same gateway
 * endpoints, same payloads, same query key, RE-IMPLEMENTED against the native
 * gateway client (`getGateway()`): the web modules are class B (they import
 * `@/integrations/supabase/client` and read `import.meta.env`), so they cannot
 * cross the @vitana/core bridge (requirements R4).
 *
 * Not ported (no native twin exists yet; recorded in verification.md):
 *  - the web 402 paywall interceptor (`dispatchPaywall` → PaywallProvider).
 *    None of the calls here is metered, so the subscriptions screens never
 *    receive a 402 paywall body; a non-2xx answer throws GatewayError as on
 *    every other native screen.
 *
 * The writes (checkout, portal, redeem) go through `BillingActions`
 * (./actions.ts, the web requests by default). When an action answers with
 * a hosted URL, native opens it in the in-app browser (`useOpenBillingUrl`,
 * expo-web-browser; the web assigns `window.location`) and marks an external
 * flow pending. `useBillingReturnLeg` is the return leg: when the browser
 * closes, and on AppState 'active' / screen focus while a flow is pending, it
 * invalidates + refetches billing/me, polling briefly for webhook lag
 * (`refreshAfterExternalFlow`). Tests use the fake gateway only.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { gatewayJson } from '../../../ports/core';
import { getGateway } from '../../../auth/gateway';
import { useBillingActions, type PortalResult } from './actions';

export interface BillingMe {
  ok: true;
  plan: {
    plan_key: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    trial_end: string | null;
    price_key: string | null;
    source: string | null;
  };
  wallet: {
    purchased_credits: number;
    reward_credits: number;
    cash_balance: number;
    balance_total: number;
  };
  usage: Record<
    string,
    {
      used: number;
      quota: number;
      reset_at: string | null;
      unit: string;
      behavior: string;
    }
  >;
  earnings: { year_in_cents: number };
  stripe: { has_customer: boolean; has_paid_subscription: boolean };
}

export interface CheckoutResult {
  ok: true;
  url: string;
  session_id?: string;
}

export interface RedeemResult {
  ok: boolean;
  redemption_id?: string;
  granted_plan?: string;
  granted_until?: string;
  grant_value_cents?: number;
  uses_count?: number;
  max_uses?: number;
  campaign?: string;
  error?: string;
  message?: string;
}

export interface FoundingStatus {
  ok: boolean;
  active: boolean;
  uses_count?: number;
  max_uses?: number;
  remaining?: number;
  code?: string | null;
  campaign?: string;
}

/** Web `QK_BILLING_ME`. */
export const BILLING_ME_KEY = ['billing', 'me'] as const;
const FOUNDING_STATUS_KEY = ['billing', 'founding-status'] as const;

/** Web `useBilling()` → GET /api/v1/billing/me. */
export function useBilling() {
  return useQuery<BillingMe>({
    queryKey: BILLING_ME_KEY,
    queryFn: () => gatewayJson<BillingMe>(getGateway(), '/billing/me', { method: 'GET' }),
    staleTime: 30_000,
    retry: 1,
  });
}

/**
 * Web `fetchFoundingStatus()` (FoundingBanner): the public founding-campaign
 * counter, refreshed every 30 s while shown; any failure reads as "no banner"
 * (the web returns null). Disabled for paid members, like the web effect.
 */
export function useFoundingStatus(enabled: boolean) {
  return useQuery<FoundingStatus | null>({
    queryKey: FOUNDING_STATUS_KEY,
    queryFn: async () => {
      try {
        return await gatewayJson<FoundingStatus>(getGateway(), '/billing/founding-status', { method: 'GET' });
      } catch {
        return null;
      }
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    retry: false,
  });
}

/** Web `useStartSubscriptionCheckout`; the write goes to `BillingActions` (./actions.ts). */
export function useStartSubscriptionCheckout() {
  const actions = useBillingActions();
  return useMutation<CheckoutResult, Error, { priceKey: string }>({
    mutationFn: ({ priceKey }) => actions.startSubscriptionCheckout(priceKey),
  });
}

/** Web `useStartCreditsCheckout`; through `BillingActions`. */
export function useStartCreditsCheckout() {
  const actions = useBillingActions();
  return useMutation<CheckoutResult, Error, { packKey: string }>({
    mutationFn: ({ packKey }) => actions.startCreditsCheckout(packKey),
  });
}

/** Web `useOpenPortal`; through `BillingActions`. */
export function useOpenPortal() {
  const actions = useBillingActions();
  return useMutation<PortalResult, Error, void>({
    mutationFn: () => actions.openPortal(),
  });
}

/** Web `useRedeemCode`; through `BillingActions`. Refreshes billing/me after a granted code. */
export function useRedeemCode() {
  const qc = useQueryClient();
  const actions = useBillingActions();
  return useMutation<RedeemResult, Error, { code: string }>({
    mutationFn: ({ code }) => actions.redeemCode(code),
    onSuccess: (result) => {
      if (result.ok) void qc.invalidateQueries({ queryKey: BILLING_ME_KEY });
    },
  });
}

/** Webhook lag: up to 5 reads of billing/me, 2 s apart, stopping as soon as the plan or credits change. */
const RETURN_POLL_ATTEMPTS = 5;
const RETURN_POLL_INTERVAL_MS = 2_000;

/** An external billing flow (hosted checkout / portal) the member has not come back from yet. */
type PendingFlow = { baseline: string | null; polling: boolean };
const pendingFlows = new WeakMap<QueryClient, PendingFlow>();

/** What a finished checkout / portal visit changes: the plan and the credit balances. */
function billingSignature(me: BillingMe | undefined): string | null {
  if (!me) return null;
  const { plan, wallet } = me;
  return JSON.stringify([
    plan.plan_key,
    plan.status,
    plan.price_key,
    plan.current_period_end,
    plan.cancel_at_period_end,
    wallet.purchased_credits,
    wallet.balance_total,
  ]);
}

function markPendingFlow(qc: QueryClient): void {
  const current = pendingFlows.get(qc);
  if (current?.polling) return;
  pendingFlows.set(qc, { baseline: billingSignature(qc.getQueryData<BillingMe>(BILLING_ME_KEY)), polling: false });
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The member is back from a pending external flow: invalidate + refetch billing/me, then poll
 * (webhooks lag) until the plan or credits differ from what the screen showed when the page
 * opened, at most RETURN_POLL_ATTEMPTS reads. The flow is closed afterwards either way.
 */
export async function refreshAfterExternalFlow(qc: QueryClient): Promise<void> {
  const flow = pendingFlows.get(qc);
  if (!flow || flow.polling) return;
  flow.polling = true;
  try {
    for (let attempt = 0; attempt < RETURN_POLL_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await wait(RETURN_POLL_INTERVAL_MS);
      if (pendingFlows.get(qc) !== flow) break; // closed meanwhile (?checkout=cancelled)
      await qc.invalidateQueries({ queryKey: BILLING_ME_KEY });
      if (billingSignature(qc.getQueryData<BillingMe>(BILLING_ME_KEY)) !== flow.baseline) break;
    }
  } finally {
    if (pendingFlows.get(qc) === flow) pendingFlows.delete(qc);
  }
}

/**
 * Opens the hosted checkout / portal page (web: `window.location.assign(url)` / `window.open`)
 * in the in-app browser and marks the flow pending. iOS resolves when the member closes the
 * browser (`cancel` / `dismiss`): that is the return, so billing/me is refreshed then. Android
 * resolves `opened` at once; its return is the AppState 'active' handled by `useBillingReturnLeg`.
 */
export function useOpenBillingUrl(): (url: string | undefined | null) => void {
  const qc = useQueryClient();
  return useCallback(
    (url: string | undefined | null) => {
      if (!url) return;
      markPendingFlow(qc);
      void WebBrowser.openBrowserAsync(url)
        .then((result) => {
          if (String(result?.type) !== 'opened') void refreshAfterExternalFlow(qc);
        })
        .catch(() => undefined);
    },
    [qc],
  );
}

/**
 * The return leg the screens mount: while an external flow is pending, coming back to the
 * foreground (AppState 'active') or to the screen (focus) refreshes billing/me. `checkout` is the
 * web's return param (`/wallet/subscriptions?checkout=success|cancelled`, the gateway's success /
 * cancel URLs): `success` refreshes with the webhook poll, `cancelled` reads billing/me once and
 * closes the flow. The web shows no toast for either; the result is the refreshed plan card.
 */
export function useBillingReturnLeg(checkout?: string | string[]): void {
  const qc = useQueryClient();
  const { data } = useBilling();
  const loaded = data !== undefined;
  const value = Array.isArray(checkout) ? checkout[0] : checkout;
  const handled = useRef<string | undefined>(undefined);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refreshAfterExternalFlow(qc);
    });
    return () => sub.remove();
  }, [qc]);

  // A `?checkout=` link is handled below (it decides poll vs single read), so focus defers to it.
  useFocusEffect(
    useCallback(() => {
      if (!value) void refreshAfterExternalFlow(qc);
    }, [qc, value]),
  );

  useEffect(() => {
    if (!loaded || !value || handled.current === value) return;
    handled.current = value;
    if (value === 'success') {
      if (!pendingFlows.has(qc)) markPendingFlow(qc);
      void refreshAfterExternalFlow(qc);
    } else if (value === 'cancelled') {
      pendingFlows.delete(qc);
      void qc.invalidateQueries({ queryKey: BILLING_ME_KEY });
    }
  }, [loaded, value, qc]);
}

/** The backend error code of a failed call (web `BillingApiError.errorCode`). */
export function errorCodeOf(err: unknown): string | undefined {
  const body = (err as { body?: unknown } | null)?.body;
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') return (body as { error: string }).error;
  return undefined;
}
