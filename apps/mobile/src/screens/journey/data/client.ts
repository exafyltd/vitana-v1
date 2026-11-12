/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — the two gateway
 * doors the My Journey data goes through, re-implemented natively (the web
 * modules are class-B: they import the community gateway / the Supabase
 * session, so they are not core-extracted):
 *
 *  - `communityFetch` — twin of `src/lib/community-gateway.ts:7-25`: the
 *    member's Bearer token (N1's `createGatewayFetch` via `getGateway()`, which
 *    also adds the `/api/v1` prefix), `X-Vitana-Active-Role: community`, and
 *    `Content-Type: application/json` for a string body. Paths are relative to
 *    `/api/v1` (`/my-journey` = web `/api/v1/my-journey`).
 *  - `autopilotFetch` — twin of `getAuthHeaders()` in `src/hooks/use-autopilot.ts:92-103`:
 *    the Autopilot calls send `Content-Type: application/json`, `X-User-ID` and
 *    the active role on every request. Mobile is always `community`
 *    (`src/hooks/useAutopilotRole.ts:31`).
 *
 * Both return a small Response-like object so the hooks keep the web's
 * `if (!res.ok) …; res.json()` shape.
 */
import { getGateway } from '../../../auth/gateway';

export const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';
/** Mobile is always community (useAutopilotRole.ts:31). */
export const AUTOPILOT_ROLE = 'community';

export interface JsonResponse {
  ok: boolean;
  status: number;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

async function call(path: string, init: RequestInit, headers: Record<string, string>): Promise<JsonResponse> {
  const res = await getGateway()(path, { ...init, headers: { ...headers, ...((init.headers as Record<string, string> | undefined) ?? {}) } });
  const body = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    text: async () => body,
    json: async <T,>() => (body ? (JSON.parse(body) as T) : ({} as T)),
  };
}

/** web `communityFetch(path, options)`. */
export function communityFetch(path: string, init: RequestInit = {}): Promise<JsonResponse> {
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  return call(path, init, headers);
}

/** web `fetch(`${GATEWAY_URL}${path}`, { headers: await getAuthHeaders(apRole) })`. */
export function autopilotFetch(path: string, userId: string, init: RequestInit = {}): Promise<JsonResponse> {
  return call(path, init, { 'Content-Type': 'application/json', 'X-User-ID': userId, [ACTIVE_ROLE_HEADER]: AUTOPILOT_ROLE });
}
