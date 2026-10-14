/**
 * VTID-05183 — a gateway fetch built only from injected configuration: the
 * origin, the access-token getter and the fetch implementation. Nothing is
 * taken from a global by default, and there is no default origin.
 */
import { gatewayApiUrl } from './config';

export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

export interface GatewayFetchOptions {
  origin: string;
  /** Returns the member's access token, or null when signed out. */
  getAccessToken: () => string | null | undefined | Promise<string | null | undefined>;
  fetchImpl: FetchImpl;
}

export type GatewayFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function createGatewayFetch({ origin, getAccessToken, fetchImpl }: GatewayFetchOptions): GatewayFetch {
  if (typeof fetchImpl !== 'function') throw new Error('@vitana/core: createGatewayFetch needs fetchImpl (no global fetch is used by default).');
  if (typeof getAccessToken !== 'function') throw new Error('@vitana/core: createGatewayFetch needs getAccessToken.');
  const api = gatewayApiUrl(origin);
  return async (path, init = {}) => {
    const rel = path.startsWith('/') ? path : `/${path}`;
    const headers: Record<string, string> = {};
    new Headers(init.headers ?? undefined).forEach((value, key) => {
      headers[key] = value;
    });
    const token = await getAccessToken();
    if (token) headers.authorization = `Bearer ${token}`;
    return fetchImpl(`${api}${rel}`, { ...init, headers });
  };
}

/** A failed gateway call. `key`/`params` carry backend-supplied UI text (`{ key, params }`), never a raw string. */
export class GatewayError extends Error {
  readonly status: number;
  readonly key?: string;
  readonly params?: Record<string, unknown>;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const b = (body && typeof body === 'object' ? body : {}) as { key?: unknown; params?: unknown };
    const key = typeof b.key === 'string' ? b.key : undefined;
    super(`Gateway request failed with status ${status}${key ? ` (${key})` : ''}`);
    this.name = 'GatewayError';
    this.status = status;
    this.key = key;
    this.params = b.params && typeof b.params === 'object' ? (b.params as Record<string, unknown>) : undefined;
    this.body = body;
  }
}

/** Calls the gateway and parses JSON; a non-2xx answer throws GatewayError. */
export async function gatewayJson<T>(gatewayFetch: GatewayFetch, path: string, init?: RequestInit): Promise<T> {
  const res = await gatewayFetch(path, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) throw new GatewayError(res.status, body);
  return body as T;
}
