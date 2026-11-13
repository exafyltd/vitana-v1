/**
 * VTID-05178 — the one fetch helper for gateway calls (N4-APP).
 *
 * Every URL is built from `requireUrl(config, 'gatewayUrl')` by the caller, so
 * a build without a G1 gateway URL never reaches this function, and a
 * production or staging host throws before any request (env.ts).
 */

import { CLIENT_HEADER, clientIdentityHeaders } from './client-identity';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const DEFAULT_TIMEOUT_MS = 3000;

/** Normalises any HeadersInit to a plain object and drops a caller-supplied client header (VTID-05656). */
function withClientIdentity(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (headers) {
    const entries: Array<[string, string]> =
      typeof Headers !== 'undefined' && headers instanceof Headers
        ? Array.from((headers as unknown as { entries(): Iterable<[string, string]> }).entries())
        : Array.isArray(headers)
          ? (headers as Array<[string, string]>)
          : Object.entries(headers as Record<string, string>);
    for (const [k, v] of entries) {
      if (k.toLowerCase() !== CLIENT_HEADER.toLowerCase()) out[k] = v;
    }
  }
  return { ...out, ...clientIdentityHeaders() };
}

/** fetch with a hard timeout. Every call is a gateway call and carries `X-Vitana-Client`. Rejects on timeout; never retries. */
export async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error(`Request timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fetchImpl(url, { ...init, headers: withClientIdentity(init.headers), signal: controller?.signal ?? init.signal }), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Joins the configured gateway base and an `/api/...` path (no double slash). */
export function gatewayEndpoint(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}
