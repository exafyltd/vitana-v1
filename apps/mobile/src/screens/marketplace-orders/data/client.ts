/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — the two
 * data doors every marketplace / provider / orders read and write goes
 * through. Both web paths are class-B (they import the Supabase client or the
 * community gateway), so they are re-implemented natively, never moved into
 * core (plan decision 2):
 *
 *  - `db()` — the app's Supabase client (the web `supabase` import): the
 *    `cj_orders`, `event_ticket_purchases`, `voucher_orders`,
 *    `provider_appointments`, `bookmarked_items`, `user_wallets`, `messages`,
 *    `calendar_events` and `vitana_index_scores` reads / writes, the wallet
 *    RPCs and the Edge Functions, with the queries unchanged from the web hooks
 *    (so any test / service allowlist exclusion they carry is inherited).
 *  - `communityFetch()` — twin of `src/lib/community-gateway.ts:7-25`:
 *    `getGateway()` (N1's createGatewayFetch: Bearer token + `/api/v1`) plus
 *    `X-Vitana-Active-Role: community` and a JSON content type for a string
 *    body. Used by the intent board, My listings and the intent share.
 */
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';

export const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any;

/** The app's Supabase client, untyped like the web hooks' `(supabase as any)` reads. */
export function db(): Db {
  return getSupabase() as unknown as Db;
}

/** `communityFetch(path, init)` — `path` is relative to `/api/v1`. */
export function communityFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  return getGateway()(path, { ...init, headers: { ...headers, ...((init.headers as Record<string, string> | undefined) ?? {}) } });
}

/** `res.json()` that tolerates an empty body. */
export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * The signed-in member (web `supabase.auth.getUser()`), or null. Read from the
 * stored session, the same user the shell's AuthProvider holds.
 */
export async function currentUser(): Promise<{ id: string; app_metadata?: Record<string, unknown> } | null> {
  const { data } = await db().auth.getSession();
  return data?.session?.user ?? null;
}

export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}
