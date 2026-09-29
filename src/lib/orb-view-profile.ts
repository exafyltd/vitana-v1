/**
 * VTID-04561 — which Vitana this screen asks for.
 *
 * Owner rule (2026-09-25): the role whose screens are displayed decides which
 * Vitana assists. The ORB widget sends these two values with every session
 * start; the gateway verifies them against the token (it never trusts a
 * declared role the account does not hold) and resolves the session's
 * Assistant Profile from them.
 *
 * Pure: no React, no I/O — pinned by orb-view-profile.test.ts.
 */

export type OrbSurface = "vitanaland" | "admin" | "backoffice" | "commerce";

/** The surface a route of this app belongs to. The Command Hub is a separate app. */
export function orbSurfaceForRoute(route: string | null | undefined): OrbSurface {
  const r = (route || "").toLowerCase();
  if (r === "/commerce" || r.startsWith("/commerce/") || r === "/partner" || r.startsWith("/partner/")) return "commerce";
  if (r === "/backoffice" || r.startsWith("/backoffice/")) return "backoffice";
  if (r === "/admin" || r.startsWith("/admin/")) return "admin";
  return "vitanaland";
}

const MEMBER_PLANE = new Set(["community", "patient", "professional", "staff"]);

/**
 * The view role to declare: on a work surface, that surface's role; on the
 * member app, the role the user is viewing — a work-plane role (developer,
 * admin, backoffice, infra) viewing member screens is declared as community.
 */
export function orbViewRoleFor(surface: OrbSurface, currentRole: string | null | undefined): string {
  if (surface === "admin") return "admin";
  if (surface === "backoffice") return "backoffice";
  if (surface === "commerce") return "commerce";
  const role = (currentRole || "").toLowerCase();
  return MEMBER_PLANE.has(role) ? role : "community";
}

/** Both values for a route + role, as the widget expects them. */
export function orbViewProfile(route: string | null | undefined, currentRole: string | null | undefined): {
  surface: OrbSurface;
  view_role: string;
} {
  const surface = orbSurfaceForRoute(route);
  return { surface, view_role: orbViewRoleFor(surface, currentRole) };
}
