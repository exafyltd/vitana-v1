/**
 * VTID-03107 · Billing v1 — React Query hooks
 *
 * Read:
 *   useBilling()                  → /billing/me + stable refresh
 *
 * Mutations:
 *   useStartSubscriptionCheckout  → POST /checkout/subscription, returns URL
 *   useStartCreditsCheckout       → POST /checkout/credits, returns URL
 *   useOpenPortal                 → POST /portal, returns URL
 *   useSpendCredits               → POST /credits/spend, idempotent
 *   useRedeemCode                 → POST /redeem
 *
 * All mutations invalidate the `['billing', 'me']` query on success so the
 * Subscriptions screen rerenders with fresh plan / wallet / usage state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBillingMe,
  startSubscriptionCheckout,
  startCreditsCheckout,
  openBillingPortal,
  spendCredits,
  redeemCode,
  type BillingMe,
  type CheckoutResult,
  type SpendCreditsResult,
  type RedeemResult,
} from '@/lib/billingApi';

const QK_BILLING_ME = ['billing', 'me'] as const;

export function useBilling() {
  return useQuery<BillingMe>({
    queryKey: QK_BILLING_ME,
    queryFn: fetchBillingMe,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useStartSubscriptionCheckout() {
  return useMutation<CheckoutResult, Error, { priceKey: string }>({
    mutationFn: ({ priceKey }) => startSubscriptionCheckout(priceKey),
  });
}

export function useStartCreditsCheckout() {
  return useMutation<CheckoutResult, Error, { packKey: string }>({
    mutationFn: ({ packKey }) => startCreditsCheckout(packKey),
  });
}

export function useOpenPortal() {
  return useMutation<{ ok: true; url: string }, Error, void>({
    mutationFn: () => openBillingPortal(),
  });
}

export function useSpendCredits() {
  const qc = useQueryClient();
  return useMutation<
    SpendCreditsResult,
    Error,
    { feature: string; units?: number; idempotencyKey?: string; bucket?: 'purchased_credits' | 'reward_credits' }
  >({
    mutationFn: ({ feature, units, idempotencyKey, bucket }) =>
      spendCredits(feature, units ?? 1, idempotencyKey, bucket),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_BILLING_ME });
    },
  });
}

export function useRedeemCode() {
  const qc = useQueryClient();
  return useMutation<RedeemResult, Error, { code: string }>({
    mutationFn: ({ code }) => redeemCode(code),
    onSuccess: (result) => {
      if (result.ok) {
        qc.invalidateQueries({ queryKey: QK_BILLING_ME });
      }
    },
  });
}
