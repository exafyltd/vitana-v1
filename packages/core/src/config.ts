/**
 * VTID-05183 — the endpoints every core client is built from. There is NO
 * default anywhere in packages/core: the app passes them from
 * apps/mobile/src/config/env.ts (`endpoints(config)`), which is the one place
 * that refuses production and staging hosts and keys.
 */
export interface CoreEndpoints {
  /** Bare gateway origin (no `/api/v1`). */
  gatewayOrigin: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  /** PostgREST-Aurora proxy (VTID-05023); unset = PostgREST stays on supabaseUrl. */
  dataApiUrl?: string;
}

/**
 * The gateway API root for an origin: trims, strips trailing slashes and a
 * trailing `/api/v1` (the same normalisation as the web's resolveGatewayBase),
 * then appends `/api/v1`. Empty input throws — there is no fallback origin.
 */
export function gatewayApiUrl(origin: string): string {
  const base = (origin ?? '').trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '').replace(/\/+$/, '');
  if (!base) throw new Error('@vitana/core: the gateway origin is empty. There is no default gateway (VTID-05183); pass endpoints(config).gatewayOrigin.');
  return `${base}/api/v1`;
}
