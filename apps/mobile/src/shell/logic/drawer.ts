/**
 * VTID-05186 (N3, plan change 3) — the drawer's row rules, ported from the body
 * of src/components/mobile/SideDrawerNav.tsx (`communityRows`, `rows`,
 * `roleTone`, `modeTone`, `isActive`). Pinned in scripts/native/shell-pins.json:
 * when the web text changes, check-shell-pins.mjs fails until this file and
 * its pin are updated. Deleted once the web rules become a pure module N1 can
 * export (plan open question 1).
 *
 * The two cross-mode filters are kept apart on purpose (round-1 F2):
 *   - business mode: only ['patient-results', 'support', 'settings'] — no
 *     commerce, no health-orders; logout is appended after the switch row;
 *   - role mode: CROSS_MODE_IDS minus routes the role navigation already lists,
 *     logout excluded from the filter and appended last.
 */
import {
  BUSINESS_DRAWER_KEYS,
  CROSS_MODE_IDS,
  businessDrawerItems,
  drawerNavIconTones,
  drawerNavItems,
  patientNavigation,
  professionalNavigation,
  staffNavigation,
  type DrawerIconTone,
  type DrawerNavItem,
  type IconName,
  type NavigationItem,
  type UserRole,
} from '../../ports/core';

export type DrawerRow = DrawerNavItem & { fallback?: string; action?: 'logout' | 'switch-community'; exact?: boolean };

export type DrawerInput = {
  dbRole: UserRole;
  isPatient: boolean;
  isPartnerOrgMember: boolean;
  /** isIAPRestricted(): today's Appilix iOS rule — Platform.OS === 'ios' (program decision 5 default). */
  iapRestricted: boolean;
  /** The active business org's role while in business mode, else null. */
  business: { role: string } | null;
};

const SWITCH_ROW: DrawerRow = {
  id: 'switch-community',
  route: '__switch__',
  icon: 'Users' as IconName,
  translationKey: 'screens.mobile.switchToCommunity',
  action: 'switch-community',
};

/**
 * getRoleNavigation(dbRole) for the roles N1 exports. Admin's navigation is
 * the admin console (system browser on native, program decision 3), so its
 * drawer carries only the cross-mode rows; developer/infra never reach the
 * phone's switcher and keep the community rows.
 */
function roleNavigation(role: UserRole): NavigationItem[] | null {
  if (role === 'patient') return patientNavigation;
  if (role === 'professional') return professionalNavigation;
  if (role === 'staff') return staffNavigation;
  if (role === 'admin') return [];
  return null;
}

export function composeDrawerRows(input: DrawerInput): DrawerRow[] {
  const { dbRole, isPatient, isPartnerOrgMember, iapRestricted, business } = input;
  const communityRows: DrawerRow[] = drawerNavItems
    .filter((item) => !(iapRestricted && item.id === 'wallet'))
    .filter((item) => !(item.id === 'patient-results' && dbRole === 'community' && !isPatient))
    .filter((item) => !(item.id === 'health-orders' && !isPartnerOrgMember))
    .filter((item) => !(item.id === 'commerce' && !isPartnerOrgMember))
    .map((item) => (item.id === 'logout' ? { ...item, action: 'logout' as const } : item));
  const logoutRow = communityRows.find((item) => item.action === 'logout');

  if (business) {
    const bizRows: DrawerRow[] = businessDrawerItems(business.role).map((nav) => ({
      id: nav.id,
      route: nav.path,
      icon: nav.icon,
      translationKey: BUSINESS_DRAWER_KEYS[nav.id] ?? nav.i18nKey,
      exact: nav.exact,
    }));
    const crossRows = communityRows.filter((item) => ['patient-results', 'support', 'settings'].includes(item.id) && item.action !== 'logout');
    return [...bizRows, ...crossRows, SWITCH_ROW, ...(logoutRow ? [logoutRow] : [])];
  }
  const nav = roleNavigation(dbRole);
  if (dbRole === 'community' || dbRole === 'backoffice' || nav === null) return communityRows;
  const roleRows: DrawerRow[] = nav
    .filter((n) => n.path !== '/settings')
    .map((n) => ({ id: `role:${n.path}`, route: n.path, icon: n.icon, translationKey: n.i18nKey ?? '', fallback: n.title }));
  const roleRoutes = new Set(roleRows.map((row) => row.route));
  const crossRows = communityRows.filter((item) => CROSS_MODE_IDS.includes(item.id) && item.action !== 'logout' && !roleRoutes.has(item.route));
  return [...roleRows, ...crossRows, SWITCH_ROW, ...(logoutRow ? [logoutRow] : [])];
}

/** One icon tone per mode for the mapped role rows (SideDrawerNav `roleTone`). */
export function roleTone(dbRole: UserRole, inBusinessMode: boolean): DrawerIconTone | undefined {
  return inBusinessMode ? drawerNavIconTones.commerce : drawerNavIconTones[dbRole];
}

/** The header chip's dot (SideDrawerNav `modeTone`): Community borrows the switch-community amber. */
export function modeTone(dbRole: UserRole, inBusinessMode: boolean): DrawerIconTone {
  return roleTone(dbRole, inBusinessMode) ?? drawerNavIconTones['switch-community'];
}

/** SideDrawerNav `isActive`. */
export function drawerRowActive(pathname: string, route: string, exact?: boolean): boolean {
  if (route === '__logout__' || route === '__switch__') return false;
  if (pathname === route) return true;
  if (exact) return false;
  if (route === '/discover') return pathname === '/discover';
  if (route === '/commerce') return pathname === '/commerce';
  return pathname.startsWith(route + '/');
}
