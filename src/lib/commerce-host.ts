/**
 * commerce.vitanaland.com host detection (VTID-03555).
 *
 * The merchant self-service portal is host-routed: the SAME community-app
 * build serves it, and the /commerce/* routes are always reachable
 * path-based (so PR previews and staging can verify them without DNS).
 * On the dedicated commerce host, the root path redirects into /commerce.
 * DNS/exposure for the host itself is deferred (BLK-006 pattern) — an ALB
 * host rule + Cloudflare Worker origin per the VTID-03419 precedent.
 */

const COMMERCE_HOSTS = new Set(['commerce.vitanaland.com']);

export function isCommerceHost(hostname: string = window.location.hostname): boolean {
  return COMMERCE_HOSTS.has(hostname.toLowerCase());
}

/** Owner-scoped merchant portal API base (gateway VTID-03553). */
export const MY_PORTAL_API = '/api/v1/vcaop/portal/my';
