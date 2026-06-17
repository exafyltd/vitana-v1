/**
 * Guest (signed-out) auth helpers.
 *
 * Public browse surfaces (e.g. /discover and its child tabs) render for
 * unauthenticated visitors. When a guest performs an action that requires an
 * account (buy, view orders, earn rewards), we route them to the tenant
 * sign-in portal, preserving the page they came from via `?redirectTo=` so
 * they land back on the browse surface after authenticating.
 */
import { DOMAIN_TENANT_MAP } from "@/config/domain-tenant-mapping";

/**
 * Resolve the tenant sign-in/portal route for the current visitor.
 * Mirrors AuthGuard.getLoginRoute, but standalone so it can be used by
 * components that render before/without an authenticated session.
 */
export function resolveLoginRoute(): string {
  let slug: string | null = null;
  try {
    slug = localStorage.getItem("tenant_slug");
  } catch {
    // localStorage unavailable (private mode / SSR) — fall back to hostname.
  }
  slug = slug || DOMAIN_TENANT_MAP[window.location.hostname] || "maxina";
  if (slug === "alkalma") return "/alkalma";
  if (slug === "earthlinks") return "/earthlinks";
  return "/maxina";
}

/**
 * The sign-in route with the current location preserved as `?redirectTo=`,
 * so the visitor returns to where they were after signing in.
 */
export function loginRouteWithRedirect(): string {
  const intended = window.location.pathname + window.location.search;
  return `${resolveLoginRoute()}?redirectTo=${encodeURIComponent(intended)}`;
}
