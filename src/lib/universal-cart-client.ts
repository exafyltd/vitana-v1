/**
 * VTID-03236 — Universal Cart gateway client (vitana-v1 side).
 *
 * Pure fetch wrapper around the `/api/v1/universal-cart/*` routes shipped in
 * vitana-platform VTID-03213. Mirrors the existing `community-gateway.ts`
 * shape so the call patterns line up with the rest of the app.
 *
 * STRICT SCOPE — DO NOT add calls to any Lovable-side commerce table here.
 *   - This module talks ONLY to the gateway.
 *   - The legacy `cart_items` / `checkout_sessions` / `cj_*` / `vouchers` /
 *     `user_wallets` / `wallet_credits` flows live in src/hooks/useCart.ts
 *     and adjacent files; they are NOT touched by Universal Cart.
 *   - Convergence between the two carts is tracked in
 *     vitana-platform issue #2371 (VTID-03176).
 *
 * Auth model: every call sends `Authorization: Bearer <supabase access token>`
 * plus `X-Vitana-Active-Role: community`. The gateway enforces the
 * community-only gate server-side and returns
 *   HTTP 403 { ok:false, error:'cart_unavailable_for_role', role:string|null }
 * for any non-community session. Surface that as a typed error so UI layers
 * can render the right empty state.
 */

import { supabase } from "@/integrations/supabase/client";

// The same env var used by community-gateway.ts. Vitana-v1's CLAUDE.md lists
// VITE_GATEWAY_URL as the canonical name, but community-gateway.ts uses
// VITE_GATEWAY_BASE today; check both so the rollout works in either env.
type ViteEnv = { VITE_GATEWAY_BASE?: string; VITE_GATEWAY_URL?: string };
const __env: ViteEnv =
  (import.meta as unknown as { env?: ViteEnv }).env ?? {};
const GATEWAY_BASE: string = (
  __env.VITE_GATEWAY_BASE ||
  __env.VITE_GATEWAY_URL ||
  "https://gateway-q74ibpv6ia-uc.a.run.app"
).replace(/\/+$/, "");

// =============================================================================
// Types
// =============================================================================

export type UniversalCartItemType = "supplement" | "partner_product";
export type UniversalCartSourceSurface =
  | "web"
  | "mobile"
  | "voice"
  | "autopilot"
  | "community"
  // Vitanaland video-shop feed (TikTok-style). Additive — the gateway extends
  // universal_cart_items_source_surface_check to accept this value.
  | "video_shop";
export type UniversalCartItemStatus = "active" | "removed" | "completed" | "expired";
export type UniversalCartStatus = "active" | "archived";
export type UniversalCartEventType =
  | "cart.created"
  | "item.added"
  | "item.removed"
  | "item.quantity_changed"
  | "item.completed"
  | "cart.archived"
  | string; // open enum for forward compatibility

export interface UniversalCart {
  id: string;
  user_id: string;
  tenant_id: string | null;
  status: UniversalCartStatus;
  source_context: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UniversalCartItem {
  id: string;
  cart_id: string;
  item_type: UniversalCartItemType;
  product_id: string;
  merchant_id: string | null;
  quantity: number;
  unit_price_cents_snapshot: number | null;
  currency_snapshot: string | null;
  source_surface: UniversalCartSourceSurface | null;
  source_ref: string | null;
  status: UniversalCartItemStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UniversalCartEvent {
  id: number;
  cart_id: string;
  user_id: string;
  event_type: UniversalCartEventType;
  event_payload: Record<string, unknown>;
  created_at: string;
}

export interface GetCartResponse {
  ok: true;
  cart: UniversalCart | null;
  items: UniversalCartItem[];
}

export interface CreateOrFetchCartResponse {
  ok: true;
  cart: UniversalCart;
  created: boolean;
}

export type AddItemAction = "created" | "quantity_bumped";

export interface AddItemResponse {
  ok: true;
  cart_id: string;
  item: UniversalCartItem;
  action: AddItemAction;
  cart_created: boolean;
}

export interface AddItemInput {
  product_id: string;
  item_type: UniversalCartItemType;
  quantity?: number;
  source_surface?: UniversalCartSourceSurface;
  source_ref?: string;
  merchant_id?: string;
  unit_price_cents_snapshot?: number;
  currency_snapshot?: string;
  autopilot_rec_id?: string;
  // Video-shop sale attribution (additive, nullable on the gateway). Set when
  // an add originates from the shop feed so checkout can snapshot the source
  // video + creator onto product_orders for affiliate payout.
  source_video_id?: string;
  source_creator_id?: string;
  metadata?: Record<string, unknown>;
}

export interface PatchItemInput {
  quantity?: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown whenever the gateway returns 403 `cart_unavailable_for_role`.
 * UI layers should catch this and render the community-only empty state
 * instead of treating it as a generic error.
 */
export class UniversalCartRoleError extends Error {
  readonly role: string | null;
  constructor(role: string | null) {
    super("cart_unavailable_for_role");
    this.name = "UniversalCartRoleError";
    this.role = role;
  }
}

/**
 * Thrown for any other non-2xx response. Carries the gateway's structured
 * error code so call sites can distinguish (e.g., `item_not_found` vs
 * `item_not_active` vs network 5xx).
 */
export class UniversalCartApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = "UniversalCartApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// =============================================================================
// Fetch wrapper
// =============================================================================

interface FetchOpts {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  // For tests: dependency injection seams. Production passes nothing.
  __fetch?: typeof fetch;
  __getToken?: () => Promise<string | null>;
}

async function defaultGetToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Core gateway call. Returns the parsed JSON body for 2xx responses; throws
 * `UniversalCartRoleError` for 403 / `cart_unavailable_for_role`, and
 * `UniversalCartApiError` for everything else.
 *
 * Exported so test scripts can stub `__fetch` / `__getToken` and exercise the
 * error paths without React or Supabase.
 */
export async function universalCartFetch<T>(
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const fetchImpl = opts.__fetch ?? fetch;
  const getToken = opts.__getToken ?? defaultGetToken;
  const token = await getToken();
  if (!token) {
    throw new UniversalCartApiError(401, "unauthenticated", null, "Not authenticated");
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Vitana-Active-Role": "community",
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetchImpl(`${GATEWAY_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try { parsed = JSON.parse(text); } catch { /* leave undefined */ }
  }
  const asObj = (parsed && typeof parsed === "object") ? (parsed as Record<string, unknown>) : null;

  if (!res.ok) {
    if (res.status === 403 && asObj?.error === "cart_unavailable_for_role") {
      throw new UniversalCartRoleError((asObj?.role as string | null) ?? null);
    }
    const code = (asObj && typeof asObj.error === "string") ? asObj.error : `http_${res.status}`;
    // Prefer an explicit `detail` field (e.g. invalid_request → detail[]), but
    // fall back to the whole error body so structured codes that put fields at
    // the top level (e.g. INSUFFICIENT_BALANCE → balance_minor/required_minor)
    // remain accessible to call sites via `err.detail`.
    const detail = asObj && "detail" in asObj ? asObj.detail : asObj;
    throw new UniversalCartApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

// =============================================================================
// Endpoint wrappers — thin, one per gateway route
// =============================================================================

export function getHealth(opts: FetchOpts = {}) {
  return universalCartFetch<{ ok: true; vtid: string; scope: string }>(
    "/api/v1/universal-cart/health",
    { ...opts, method: "GET" }
  );
}

export function getCart(opts: FetchOpts = {}) {
  return universalCartFetch<GetCartResponse>(
    "/api/v1/universal-cart",
    { ...opts, method: "GET" }
  );
}

export function createOrFetchCart(sourceContext?: string, opts: FetchOpts = {}) {
  return universalCartFetch<CreateOrFetchCartResponse>(
    "/api/v1/universal-cart",
    {
      ...opts,
      method: "POST",
      body: sourceContext ? { source_context: sourceContext } : {},
    }
  );
}

export function addItem(input: AddItemInput, opts: FetchOpts = {}) {
  return universalCartFetch<AddItemResponse>(
    "/api/v1/universal-cart/items",
    { ...opts, method: "POST", body: input }
  );
}

export function patchItem(itemId: string, input: PatchItemInput, opts: FetchOpts = {}) {
  return universalCartFetch<{ ok: true; item: UniversalCartItem }>(
    `/api/v1/universal-cart/items/${encodeURIComponent(itemId)}`,
    { ...opts, method: "PATCH", body: input }
  );
}

export function removeItem(itemId: string, removalReason?: string, opts: FetchOpts = {}) {
  return universalCartFetch<{ ok: true; item: UniversalCartItem }>(
    `/api/v1/universal-cart/items/${encodeURIComponent(itemId)}`,
    {
      ...opts,
      method: "DELETE",
      body: removalReason ? { removal_reason: removalReason } : undefined,
    }
  );
}

export function completeItem(itemId: string, opts: FetchOpts = {}) {
  return universalCartFetch<{
    ok: true;
    item: UniversalCartItem;
    already_completed?: boolean;
  }>(
    `/api/v1/universal-cart/items/${encodeURIComponent(itemId)}/complete`,
    { ...opts, method: "POST", body: {} }
  );
}

export function getEvents(limit?: number, opts: FetchOpts = {}) {
  const q = limit && limit > 0 ? `?limit=${Math.min(limit, 200)}` : "";
  return universalCartFetch<{ ok: true; events: UniversalCartEvent[] }>(
    `/api/v1/universal-cart/events${q}`,
    { ...opts, method: "GET" }
  );
}

// =============================================================================
// Checkout (marketplace money loop) — POST /api/v1/universal-cart/checkout
// =============================================================================

export type CheckoutCurrency = "EUR" | "USD";

export interface CheckoutInput {
  /** Optional client-supplied UUID for idempotent retries. */
  idempotency_key?: string;
  /** Optional source/session correlation id. */
  session_id?: string;
}

/**
 * The wallet-debit leg of a checkout. Present (non-null) only when the cart
 * contained wallet-payable (supplement) items. Money is integer MINOR units.
 */
export interface CheckoutWalletOrder {
  currency: CheckoutCurrency;
  amount_minor: number;
  balance_minor: number;
  /** True when an idempotency_key replayed an already-completed order. */
  duplicate: boolean;
  order_ids: string[];
}

/** A partner/affiliate item that must be completed at the merchant's site. */
export interface CheckoutAffiliateRedirect {
  item_id: string;
  product_id: string;
  affiliate_url: string;
  order_id: string | null;
}

export interface CheckoutResponse {
  ok: true;
  checkout_id: string;
  wallet_order: CheckoutWalletOrder | null;
  affiliate_redirects: CheckoutAffiliateRedirect[];
  completed_item_ids: string[];
}

/**
 * Known structured checkout error codes returned in the `{ ok:false, error }`
 * body. Surfaced via `UniversalCartApiError.code` so call sites can map each to
 * a translated message. Open enum — unknown codes fall through to a generic
 * message.
 */
export type CheckoutErrorCode =
  | "invalid_request"
  | "CART_EMPTY"
  | "PRODUCT_UNAVAILABLE"
  | "PRICE_UNAVAILABLE"
  | "MIXED_CURRENCY"
  | "UNSUPPORTED_WALLET_CURRENCY"
  | "WALLET_ACCOUNT_MISSING"
  | "WALLET_ACCOUNT_INACTIVE"
  | "INSUFFICIENT_BALANCE"
  | "TENANT_REQUIRED"
  | "WALLET_DEBIT_FAILED"
  | "CART_READ_FAILED"
  | "ORDER_WRITE_FAILED"
  | "WALLET_READ_FAILED"
  | "GATEWAY_MISCONFIGURED";

/** Shape of the 402 INSUFFICIENT_BALANCE detail (lives on the error body). */
export interface InsufficientBalanceDetail {
  error: "INSUFFICIENT_BALANCE";
  balance_minor: number;
  required_minor: number;
  currency: CheckoutCurrency;
}

/** Type guard: did checkout fail because the wallet balance was too low? */
export function isInsufficientBalanceError(
  err: unknown,
): err is UniversalCartApiError & { detail: InsufficientBalanceDetail } {
  return (
    err instanceof UniversalCartApiError &&
    err.code === "INSUFFICIENT_BALANCE" &&
    !!err.detail &&
    typeof err.detail === "object"
  );
}

/**
 * POST /api/v1/universal-cart/checkout. Debits the gateway wallet for
 * wallet-payable items and returns affiliate redirect links for partner items.
 * Throws `UniversalCartApiError` (with `.code` = a `CheckoutErrorCode`) on
 * failure, or `UniversalCartRoleError` for a non-community session.
 */
export function checkout(input: CheckoutInput = {}, opts: FetchOpts = {}) {
  return universalCartFetch<CheckoutResponse>(
    "/api/v1/universal-cart/checkout",
    { ...opts, method: "POST", body: input }
  );
}

export const __TEST_ONLY__ = { GATEWAY_BASE };
