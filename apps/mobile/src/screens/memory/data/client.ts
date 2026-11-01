/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — the community-gateway
 * call every memory read and write goes through. Native twin of the web
 * `communityFetch` (`src/lib/community-gateway.ts:13-25`) plus the `json()`
 * helper the web memory clients share (`memory-api.ts`, `memory-learning-api.ts`,
 * `timeline-api.ts`): those modules are class-B (they import the community
 * gateway), so they are re-implemented here, not core-extracted.
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
export async function memoryJson<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  const b = (body ?? {}) as { ok?: unknown; error?: unknown };
  if (!res.ok || b.ok === false) {
    throw new Error(typeof b.error === 'string' ? b.error : `HTTP ${res.status}`);
  }
  return body as T;
}
