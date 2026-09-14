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

/**
 * The Vitanaland MCP endpoint a merchant pastes into their own AI agent
 * (VTID-03600, moved here VTID-03882 so the portal and any future call site
 * read one constant).
 *
 * The PATH matters: `services/vcaop-mcp`'s own README names the endpoint
 * `https://mcp.vitanaland.com/mcp`, and MCP clients want the full endpoint,
 * not the bare host. `VITE_MCP_AS_URL` is set in no `.env` and no workflow
 * today, so the fallback below is what actually ships.
 *
 * Not reachable yet — vitana-platform `vcaop/BLOCKERS.md` BLK-006 (no DNS/TLS)
 * and BLK-007 (the embedded OAuth AS holds client/code/refresh state in process
 * memory and must not be pointed at by public DNS until that is durable). The
 * UI says so rather than implying a live connection.
 */
export function normalizeMcpUrl(raw: string): string {
  const base = raw.replace(/\/+$/, '');
  return base.endsWith('/mcp') ? base : `${base}/mcp`;
}

export const MCP_SERVER_URL = normalizeMcpUrl(
  (import.meta.env.VITE_MCP_AS_URL as string | undefined) || 'https://mcp.vitanaland.com',
);
