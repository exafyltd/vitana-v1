/**
 * Marketplace money loop — gateway wallet rail client (vitana-v1 side).
 *
 * Pure fetch wrapper around the NEW gateway commerce-wallet routes
 * (`/api/v1/wallet/*`). This is the wallet rail used for ALL marketplace
 * commerce money: `wallet_accounts`, EUR/USD, Stripe deposits. It is ADDITIVE.
 *
 * STRICT SCOPE — DO NOT touch the legacy wallet here.
 *   - The legacy `useWallet` / `user_wallets` / VTNA/CREDITS flows are entirely
 *     separate and are NOT read, written, or invalidated by this module.
 *   - This module talks ONLY to the gateway.
 *
 * Auth model: mirrors universal-cart-client.ts — every call sends
 * `Authorization: Bearer <supabase access token>` plus
 * `X-Vitana-Active-Role: community` via `communityFetch`.
 *
 * Money is integer MINOR units (cents) everywhere on this rail.
 */

import { communityFetch } from "@/lib/community-gateway";

// =============================================================================
// Types
// =============================================================================

export type WalletCurrency = "EUR" | "USD";

export interface WalletAccount {
  currency: WalletCurrency;
  balance_minor: number;
  status: string;
  updated_at: string;
}

export interface WalletBalanceResponse {
  ok: true;
  accounts: WalletAccount[];
}

export interface CreateDepositInput {
  amount_minor: number;
  currency: WalletCurrency;
}

export interface CreateDepositResponse {
  ok: true;
  deposit_id: string;
  checkout_url: string;
  expires_at: string;
}

export type DepositStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "expired"
  | "canceled"
  | string; // open enum for forward compatibility

export interface Deposit {
  id: string;
  amount_minor: number;
  currency: WalletCurrency;
  status: DepositStatus;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetDepositResponse {
  ok: true;
  deposit: Deposit;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown for any non-2xx response (or an `{ ok:false }` body). Carries the
 * gateway's structured error code so call sites can map it to a translated
 * message. Mirrors `UniversalCartApiError` in universal-cart-client.ts.
 */
export class WalletGatewayApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = "WalletGatewayApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// =============================================================================
// Fetch wrapper
// =============================================================================

interface WalletFetchOpts {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Core gateway call. Returns the parsed JSON body for 2xx `{ ok:true }`
 * responses; throws `WalletGatewayApiError` for everything else.
 */
async function walletGatewayFetch<T>(
  path: string,
  opts: WalletFetchOpts = {},
): Promise<T> {
  const res = await communityFetch(path, {
    method: opts.method ?? "GET",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      /* leave undefined */
    }
  }
  const asObj =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;

  if (!res.ok || asObj?.ok === false) {
    const code =
      asObj && typeof asObj.error === "string"
        ? asObj.error
        : `http_${res.status}`;
    throw new WalletGatewayApiError(res.status, code, asObj, text);
  }
  return parsed as T;
}

// =============================================================================
// Endpoint wrappers — thin, one per gateway route
// =============================================================================

/** GET /api/v1/wallet/balance — EUR/USD wallet_accounts balances. */
export function getWalletBalance(
  opts: WalletFetchOpts = {},
): Promise<WalletBalanceResponse> {
  return walletGatewayFetch<WalletBalanceResponse>("/api/v1/wallet/balance", {
    ...opts,
    method: "GET",
  });
}

/**
 * POST /api/v1/wallet/deposits/create — create a Stripe deposit checkout.
 * The caller should redirect the browser to `checkout_url`.
 */
export function createDeposit(
  input: CreateDepositInput,
  opts: WalletFetchOpts = {},
): Promise<CreateDepositResponse> {
  return walletGatewayFetch<CreateDepositResponse>(
    "/api/v1/wallet/deposits/create",
    { ...opts, method: "POST", body: input },
  );
}

/**
 * GET /api/v1/wallet/deposits/:id — deposit status. `status` becomes
 * 'succeeded' after the Stripe webhook credits the wallet; poll after return.
 */
export function getDeposit(
  depositId: string,
  opts: WalletFetchOpts = {},
): Promise<GetDepositResponse> {
  return walletGatewayFetch<GetDepositResponse>(
    `/api/v1/wallet/deposits/${encodeURIComponent(depositId)}`,
    { ...opts, method: "GET" },
  );
}

/** Terminal deposit states — no further polling needed once reached. */
export function isTerminalDepositStatus(status: DepositStatus): boolean {
  return status === "succeeded" || status === "failed";
}
