/**
 * Phase 1 — Shopping Agent gateway client (vitana-v1 side).
 *
 * Pure fetch wrapper around the `/api/v1/shopping-agent/*` route shipped in
 * vitana-platform Phase 1. Mirrors `universal-cart-client.ts` exactly so the
 * call patterns line up with the rest of the app: same base URL resolution,
 * same Bearer + `X-Vitana-Active-Role: community` headers, same typed error
 * classes.
 *
 * Auth model: every call sends `Authorization: Bearer <supabase access token>`
 * plus `X-Vitana-Active-Role: community`. The gateway enforces the
 * community-only gate server-side and returns
 *   HTTP 403 { ok:false, error:'cart_unavailable_for_role', role:string|null }
 * for any non-community session (surfaced as ShoppingAgentRoleError), and
 *   HTTP 502 { ok:false, error:'llm_unavailable' }
 * when no AI provider is available (surfaced as ShoppingAgentApiError with
 * code 'llm_unavailable' — see `isLlmUnavailableError`).
 *
 * The agent writes proposed items SERVER-SIDE into the user's active universal
 * cart (metadata.origin === 'agent'). Callers MUST invalidate the universal
 * cart query after a successful propose so the cart refetches — the cart list
 * is rendered from the refetched cart items, NOT from this response.
 */

import { supabase } from "@/integrations/supabase/client";

// The same env var resolution used by universal-cart-client.ts.
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

export interface ProposeAgentCartInput {
  prompt: string;
  max_items?: number;
}

export interface AgentProposedItem {
  item_id: string;
  product_id: string;
  title: string;
  rationale: string;
  safety_flags: string[];
  confidence: number;
}

export interface ProposeAgentCartResponse {
  ok: true;
  run_id: string;
  proposed: AgentProposedItem[];
  advisory: string[];
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown whenever the gateway returns 403 `cart_unavailable_for_role`.
 * UI layers should catch this and render the community-only empty state
 * instead of treating it as a generic error.
 */
export class ShoppingAgentRoleError extends Error {
  readonly role: string | null;
  constructor(role: string | null) {
    super("cart_unavailable_for_role");
    this.name = "ShoppingAgentRoleError";
    this.role = role;
  }
}

/**
 * Thrown for any other non-2xx response. Carries the gateway's structured
 * error code so call sites can distinguish (e.g., `llm_unavailable` vs a
 * generic 5xx). The `llm_unavailable` 502 is surfaced here with
 * `code === 'llm_unavailable'` — see `isLlmUnavailableError`.
 */
export class ShoppingAgentApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;
  constructor(status: number, code: string, detail: unknown, raw?: string) {
    super(raw || `${code} (${status})`);
    this.name = "ShoppingAgentApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/** Type guard: did the agent fail because no AI provider was available? */
export function isLlmUnavailableError(
  err: unknown,
): err is ShoppingAgentApiError & { code: "llm_unavailable" } {
  return err instanceof ShoppingAgentApiError && err.code === "llm_unavailable";
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
 * `ShoppingAgentRoleError` for 403 / `cart_unavailable_for_role`, and
 * `ShoppingAgentApiError` for everything else (including the 502
 * `llm_unavailable`).
 *
 * Exported so test scripts can stub `__fetch` / `__getToken` and exercise the
 * error paths without React or Supabase.
 */
export async function shoppingAgentFetch<T>(
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const fetchImpl = opts.__fetch ?? fetch;
  const getToken = opts.__getToken ?? defaultGetToken;
  const token = await getToken();
  if (!token) {
    throw new ShoppingAgentApiError(401, "unauthenticated", null, "Not authenticated");
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
      throw new ShoppingAgentRoleError((asObj?.role as string | null) ?? null);
    }
    const code = (asObj && typeof asObj.error === "string") ? asObj.error : `http_${res.status}`;
    const detail = asObj && "detail" in asObj ? asObj.detail : asObj;
    throw new ShoppingAgentApiError(res.status, code, detail, text);
  }
  return parsed as T;
}

// =============================================================================
// Endpoint wrappers — thin, one per gateway route
// =============================================================================

/**
 * POST /api/v1/shopping-agent/propose. The agent writes the proposed items
 * server-side into the user's active universal cart (metadata.origin ===
 * 'agent'). Throws `ShoppingAgentRoleError` for a non-community session, or
 * `ShoppingAgentApiError` (with `.code` e.g. `llm_unavailable`) on failure.
 */
export function proposeAgentCart(input: ProposeAgentCartInput, opts: FetchOpts = {}) {
  return shoppingAgentFetch<ProposeAgentCartResponse>(
    "/api/v1/shopping-agent/propose",
    { ...opts, method: "POST", body: input }
  );
}

export const __TEST_ONLY__ = { GATEWAY_BASE };
