/**
 * VTID-05186 (N3, plan change 14) — the signed-in area's gate:
 *   - signed out → `/maxina?redirectTo=<path>`, except the guest destinations
 *     (App.tsx `<AuthGuard allowGuest>`, GUEST_PATHS), which render in the
 *     public shell;
 *   - signed in → the role-route guard (useSmartRouting.tsx on mobile).
 */
import type { ReactNode } from 'react';
import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { DelayedLoader } from '../ports/ui';
import { useAuth } from '../auth/AuthProvider';
import { useRole } from '../identity/useRole';
import { useI18n } from '../i18n/I18nProvider';
import { GUEST_PATHS } from '../navigation/guest-paths';
import { matchPattern } from '../navigation/resolve';
import { routeGuard } from './logic/route-guard';

export function isGuestPath(path: string): boolean {
  return GUEST_PATHS.some((p) => matchPattern(p, path));
}

/** The current path + query (the catch-all's own `path` param removed). */
export function useCurrentHref(): string {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === 'path' || v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) q.append(k, String(one));
  }
  const qs = q.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function AuthGate({ member, guest }: { member: ReactNode; guest: ReactNode }) {
  const { user, loading } = useAuth();
  const { dbRole, isLoading: roleLoading } = useRole();
  const { t } = useI18n();
  const pathname = usePathname();
  const href = useCurrentHref();
  if (loading) return <DelayedLoader accessibilityLabel={t('common.loading')} />;
  if (!user) {
    if (isGuestPath(pathname)) return <>{guest}</>;
    return <Redirect href={`/maxina?redirectTo=${encodeURIComponent(href)}` as never} />;
  }
  if (!roleLoading) {
    const bounce = routeGuard(pathname, dbRole);
    if (bounce && bounce !== pathname) return <Redirect href={bounce as never} />;
  }
  return <>{member}</>;
}
