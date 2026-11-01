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
 * a hosted URL, native opens it with the system
 * (`openBillingUrl`; the web assigns `window.location`). Tests use the fake
 * gateway only.
 */
import { Linking } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/** The hosted checkout / portal page (web: `window.location.assign(url)` / `window.open`). */
export function openBillingUrl(url: string | undefined | null): void {
  if (url) void Linking.openURL(url);
}

/** The backend error code of a failed call (web `BillingApiError.errorCode`). */
export function errorCodeOf(err: unknown): string | undefined {
  const body = (err as { body?: unknown } | null)?.body;
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') return (body as { error: string }).error;
  return undefined;
}
