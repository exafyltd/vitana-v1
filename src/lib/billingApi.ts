/**
 * VTID-03107 · Billing v1 — gateway fetch wrapper with HTTP 402 paywall dispatch
 *
 * Mirrors `admin-api.ts` (Bearer token from Supabase session) but adds a
 * global 402-paywall interceptor. When the gateway returns HTTP 402, this
 * wrapper:
 *   1. Parses the structured paywall body (per services/gateway/src/middleware/paywall.ts)
 *   2. If `paywall.deferred_for_vulnerability === true` → fires a soft toast,
 *      then resolves the promise as a no-op success (the backend silently
 *      allowed the action; the user never sees a paywall)
 *   3. Otherwise dispatches a global `window` CustomEvent so `PaywallProvider`
 *      can render the modal, then throws a `PaywallError`
 *
 * Why a global event instead of a React context call: this wrapper is used
 * by hooks AND by plain TS files (e.g. OrbVoiceClient). A CustomEvent works
 * everywhere without prop drilling.
 *
 * Standard usage from a React component:
 *   try {
 *     await billingFetch('/billing/credits/spend', { method: 'POST', body: ... });
 *   } catch (err) {
 *     if (err instanceof PaywallError) {
 *       // Modal already opened by PaywallProvider; nothing more to do
 *       return;
 *     }
 *     throw err;
 *   }
 */

import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/i18n-toast';

const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || '';
// Strip trailing /api/v1 if present (vitana-v1 .env may include it)
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export const PAYWALL_EVENT_NAME = 'vitana:paywall-shown';

export interface PaywallPayload {
  feature: string;
  tier: string;
  quota: number;
  used: number;
  remaining: number;
  reset_at: string | null;
  credit_cost_per_unit: number;
  user_credit_balance: number;
  allowed_burn_buckets: Array<'purchased_credits' | 'reward_credits' | 'cash_balance'>;
  credit_option: {
    cost_per_unit: number;
    balance: number;
    balance_sufficient_for_one_unit: boolean;
    endpoint: string;
  } | null;
  upgrade_url: string;
  paywall_action: 'paywall' | 'hard_block';
  deferred_for_vulnerability?: boolean;
}

export class PaywallError extends Error {
  payload: PaywallPayload;
  status = 402;
  constructor(payload: PaywallPayload) {
    super(`payment_required:${payload.feature}`);
    this.name = 'PaywallError';
    this.payload = payload;
  }
}

export class BillingApiError extends Error {
  status: number;
  body: unknown;
  errorCode: string | null;
  constructor(status: number, body: unknown) {
    const b = body as Record<string, unknown> | null;
    const errorCode = b && typeof b === 'object' ? (b.error as string | null) ?? null : null;
    const msg = b && typeof b === 'object' ? ((b.message as string) || (b.error as string) || `HTTP ${status}`) : `HTTP ${status}`;
    super(msg);
    this.name = 'BillingApiError';
    this.status = status;
    this.body = body;
    this.errorCode = errorCode;
  }
}

export interface BillingFetchInit extends RequestInit {
  /** Throw PaywallError on 402. Default true. Pass false to inspect the 402 body directly. */
  interceptPaywall?: boolean;
}

/**
 * Dispatch the global paywall event for PaywallProvider to render the modal.
 * Wrapped so non-React callers (OrbVoiceClient, plain utility functions) can
 * trigger it without an import cycle.
 */
export function dispatchPaywall(payload: PaywallPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PAYWALL_EVENT_NAME, { detail: payload }));
}

async function getAuthHeader(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

/**
 * Core gateway fetch with 402 paywall interceptor.
 *
 * On HTTP 402:
 *   - If `body.paywall.deferred_for_vulnerability === true`: fires soft toast,
 *     returns null (treat as silently allowed)
 *   - Otherwise dispatches the global paywall event and throws PaywallError
 *
 * On other HTTP errors: throws BillingApiError with parsed body.
 * On 2xx: returns parsed JSON.
 */
export async function billingFetch<T = unknown>(
  path: string,
  init: BillingFetchInit = {}
): Promise<T> {
  const auth = await getAuthHeader();
  if (!auth) throw new Error('NO_AUTH_TOKEN');

  const url = `${GATEWAY_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      ...(init.headers || {}),
    },
  });

  // 402 paywall — try to parse structured body
  if (res.status === 402) {
    const body = await res.json().catch(() => null);
    const paywall = (body as { paywall?: PaywallPayload } | null)?.paywall;
    if (paywall) {
      // D36 deferral: backend silently allowed us; soft toast, resolve as null
      if (paywall.deferred_for_vulnerability) {
        notify('paywall.softExtension');
        // Resolve with null — callers should treat this as "your call succeeded"
        return null as unknown as T;
      }
      if (init.interceptPaywall !== false) {
        dispatchPaywall(paywall);
      }
      throw new PaywallError(paywall);
    }
    throw new BillingApiError(402, body);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new BillingApiError(res.status, body);
  }

  return (await res.json()) as T;
}

// =============================================================================
// Typed endpoint helpers
// =============================================================================

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
  usage: Record<string, {
    used: number;
    quota: number;
    reset_at: string | null;
    unit: string;
    behavior: string;
    windows?: Array<{
      name: 'window_5h' | 'weekly' | 'monthly';
      used: number;
      limit: number;
      reset_at: string | null;
    }>;
    binding_window?: 'window_5h' | 'weekly' | 'monthly';
  }>;
  earnings: { year_in_cents: number };
  stripe: { has_customer: boolean; has_paid_subscription: boolean };
}

export async function fetchBillingMe(): Promise<BillingMe> {
  return billingFetch<BillingMe>('/api/v1/billing/me', { method: 'GET' });
}

export interface CheckoutResult {
  ok: true;
  url: string;
  session_id?: string;
}

export async function startSubscriptionCheckout(priceKey: string): Promise<CheckoutResult> {
  return billingFetch<CheckoutResult>('/api/v1/billing/checkout/subscription', {
    method: 'POST',
    body: JSON.stringify({ price_key: priceKey }),
  });
}

export async function startCreditsCheckout(packKey: string): Promise<CheckoutResult> {
  return billingFetch<CheckoutResult>('/api/v1/billing/checkout/credits', {
    method: 'POST',
    body: JSON.stringify({ pack_key: packKey }),
  });
}

export async function openBillingPortal(): Promise<{ ok: true; url: string }> {
  return billingFetch<{ ok: true; url: string }>('/api/v1/billing/portal', { method: 'POST' });
}

export interface SpendCreditsResult {
  ok: true;
  duplicate?: boolean;
  bucket?: string;
  bucket_balance?: number;
  units_purchased?: number;
}

export async function spendCredits(
  feature: string,
  units: number = 1,
  idempotencyKey?: string,
  preferredBucket?: 'purchased_credits' | 'reward_credits'
): Promise<SpendCreditsResult> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return billingFetch<SpendCreditsResult>('/api/v1/billing/credits/spend', {
    method: 'POST',
    headers,
    body: JSON.stringify({ feature, units, bucket: preferredBucket }),
  });
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

export async function redeemCode(code: string): Promise<RedeemResult> {
  return billingFetch<RedeemResult>('/api/v1/billing/redeem', {
    method: 'POST',
    interceptPaywall: false, // redeem failures are not paywall events
    body: JSON.stringify({ code }),
  });
}
