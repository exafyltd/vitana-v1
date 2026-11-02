/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the community-gateway call
 * every diary and ticket read / write goes through. Native twin of the web
 * `communityFetch` (`src/lib/community-gateway.ts:13-25`) plus the `json()`
 * helper of `src/lib/memory-api.ts`: those modules are class-B (they import
 * the community gateway), so they are re-implemented here, not core-extracted.
 *
 * `getGateway()` (N1's `createGatewayFetch`) adds the Bearer token and the
 * `/api/v1` prefix; this wrapper adds what `communityFetch` adds on top, the
 * `X-Vitana-Active-Role: community` header (plan decision 2, sparring R1-F3)
 * and `Content-Type: application/json` for a string body, without changing
 * the shared `gatewayGet`.
 */
import { getGateway } from '../../../auth/gateway';

export const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';

/** Calls `path` (relative to `/api/v1`) and parses JSON; a non-2xx answer or `{ ok: false }` throws (web `json()`). */
export async function diaryJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  const res = await getGateway()(path, { ...init, headers: { ...headers, ...((init.headers as Record<string, string> | undefined) ?? {}) } });
  const text = await res.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = {};
    }
  }
  const b = (body ?? {}) as { ok?: unknown; error?: unknown; details?: unknown };
  if (!res.ok || b.ok === false) {
    const detail = typeof b.details === 'string' ? b.details : typeof b.error === 'string' ? b.error : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return body as T;
}
