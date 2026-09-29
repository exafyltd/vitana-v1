/**
 * VTID-04335 — one place that knows where the gateway lives.
 *
 * Several screens fell back to `https://gateway-q74ibpv6ia-uc.a.run.app` when
 * `VITE_GATEWAY_BASE` was unset. That is the GCP Cloud Run gateway, deleted
 * 2026-08-16 when GCP billing was disabled — a request there cannot succeed.
 * Every deploy workflow sets BOTH `VITE_GATEWAY_BASE` (bare origin) and
 * `VITE_GATEWAY_URL` (origin + `/api/v1`), so honour either, and fall back to
 * the AWS production gateway, never to a dead host.
 */
export const DEFAULT_GATEWAY_ORIGIN = 'https://gateway.vitanaland.com';

export interface GatewayEnv {
  VITE_GATEWAY_BASE?: string;
  VITE_GATEWAY_URL?: string;
}

/** Bare gateway origin (no trailing slash, no `/api/v1`). */
export function resolveGatewayBase(env: GatewayEnv): string {
  const base = (env.VITE_GATEWAY_BASE || '').trim();
  if (base) return base.replace(/\/+$/, '');
  const url = (env.VITE_GATEWAY_URL || '').trim();
  if (url) return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return DEFAULT_GATEWAY_ORIGIN;
}

export const GATEWAY_BASE = resolveGatewayBase(import.meta.env as GatewayEnv);

/** Gateway API root (origin + `/api/v1`). VTID-04398. */
export const GATEWAY_API_URL = `${GATEWAY_BASE}/api/v1`;

/**
 * VTID-04398 — the OASIS operator (dev-hub events, status, operator chat).
 * Its Cloud Run host was deleted with GCP; the AWS service is
 * `dr-oasis-operator.vitanaland.com` (platform CLAUDE.md §1b), same paths.
 */
export const DEFAULT_OPERATOR_API = 'https://dr-oasis-operator.vitanaland.com/api/v1';

export function resolveOperatorApi(value: string | undefined): string {
  const v = (value || '').trim().replace(/\/+$/, '');
  if (!v || /\.run\.app(\/|$)/.test(v)) return DEFAULT_OPERATOR_API;
  return v;
}
