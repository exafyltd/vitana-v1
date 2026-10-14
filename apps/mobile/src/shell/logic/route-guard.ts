/**
 * VTID-05186 (N3, plan change 3) — role-route enforcement on native, ported
 * from src/hooks/useSmartRouting.tsx (`COMMUNITY_PREFIXES`, `SHARED_PATHS`,
 * `CONSUMER_PATHS`, `useRoleRouteEnforcement`) with `isMobile` always true.
 * Pure: returns where to bounce, or null. Pinned in scripts/native/shell-pins.json.
 */
import type { TenantRegistry, UserRole } from '../../ports/core';
import { isTenantPortalPath } from './tenant-registry';

export const COMMUNITY_PREFIXES = ['/home', '/comm', '/discover', '/health', '/wallet', '/inbox', '/sharing', '/memory', '/autopilot', '/assistant', '/business'];
/** useSmartRouting.tsx SHARED_PATHS incl. RETIRED_TENANT_PATH_PREFIXES ('/earthlinks'); tenant portals come from the registry. */
export const SHARED_PATHS = ['/exafy-admin', '/earthlinks', '/community', '/auth', '/_intro', '/dev', '/settings', '/onboarding', '/'];
export const CONSUMER_PATHS = ['/patient/results'];

const under = (path: string, p: string) => path === p || path.startsWith(p + '/');

export function routeGuard(path: string, dbRole: UserRole, reg: TenantRegistry): string | null {
  if (path === '/admin/device-preview') return null;
  if (SHARED_PATHS.some((p) => path === p || (p !== '/' && path.startsWith(p)))) return null;
  if (isTenantPortalPath(path, reg)) return null;
  if (CONSUMER_PATHS.includes(path)) return null;

  const isOnCommunity = COMMUNITY_PREFIXES.some((p) => under(path, p));
  const isOnAdmin = under(path, '/admin');
  const isOnBackOffice = under(path, '/backoffice');
  const isOnStaff = under(path, '/staff');
  const isOnProfessional = under(path, '/professional');
  const isOnPatient = under(path, '/patient');

  // BackOffice is desktop-only (VTID-03973): always bounced on the phone.
  if (isOnBackOffice) return '/home';
  if (isOnCommunity && (dbRole === 'admin' || dbRole === 'staff')) return '/admin';
  if (isOnCommunity && dbRole === 'professional') return '/professional/dashboard';
  if (isOnCommunity && dbRole === 'patient') return '/patient/dashboard';
  if (dbRole === 'community' && (isOnAdmin || isOnStaff || isOnProfessional || isOnPatient)) return '/home';
  return null;
}
