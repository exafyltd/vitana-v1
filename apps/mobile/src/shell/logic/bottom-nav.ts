/**
 * VTID-05186 (N3, plan change 3) — the bottom bar's choice and hide rule,
 * ported from src/components/mobile/MobileBottomNav.tsx (`businessItems`,
 * `items`, `matchesRoute`, `shouldHideNav`); data from @vitana/core/nav.
 * Pinned in scripts/native/shell-pins.json.
 */
import {
  communityBottomNav,
  hideNavRoutes,
  resolveBusinessBottomNav,
  resolveRoleBottomNav,
  roleSectionRoutes,
  type BottomNavItem,
  type UserRole,
} from '../../ports/core';

export type BarItem = BottomNavItem;

/** business → role → community (MobileBottomNav.tsx `items`). */
export function resolveBottomNav(dbRole: UserRole, business: { role: string } | null): { items: BarItem[]; businessItems: BarItem[] | null; roleItems: BarItem[] | null } {
  const roleItems = resolveRoleBottomNav(dbRole);
  const businessItems = business ? resolveBusinessBottomNav(business.role).map((i) => ({ ...i, label: i.id })) : null;
  return { items: businessItems ?? roleItems ?? communityBottomNav, businessItems, roleItems };
}

export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + '/') || (route.endsWith('/') && pathname.startsWith(route));
}

/** `hasModeBar`: a business or role bar is on offer, so role sections keep a bar. */
export function shouldHideBottomNav(pathname: string, hasModeBar: boolean): boolean {
  return hideNavRoutes.some((r) => matchesRoute(pathname, r)) || (!hasModeBar && roleSectionRoutes.some((r) => matchesRoute(pathname, r)));
}

/** NavLink matching: prefix, or exact when the item says so. */
export function barItemActive(pathname: string, item: Pick<BarItem, 'path' | 'exact'>): boolean {
  if (pathname === item.path) return true;
  if (item.exact) return false;
  return pathname.startsWith(item.path.endsWith('/') ? item.path : `${item.path}/`);
}
