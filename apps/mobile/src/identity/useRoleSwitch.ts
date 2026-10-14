/**
 * VTID-05186 (N3, plan change 11) — src/hooks/useRoleSwitch.ts on native
 * (`isMobile` is always true). One write path (`set_role_preference`), then
 * the role's home: in-app routes through the router, `/admin` (admin/staff)
 * and external destinations through `openWebConsole` (program decision 3).
 * Business entries are a separate axis: a navigation, never a role write.
 */
import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  computeAvailableRoles,
  computeBusinessEntries,
  getRoleSwitchDestination,
  isExternalRoleSwitchDestination,
  type UserRole,
} from '../ports/core';
import { notifyError } from '../ports/ui';
import { useTenant } from './TenantProvider';
import { useRole } from './useRole';
import { useMemberships } from './useMemberships';
import { usePatientAccess } from './usePatientAccess';
import { useBusinessMode } from './useBusinessMode';
import { openWebConsole } from './web-console';

/** Destinations that are web consoles, not phone screens (program decision 3). */
export function isWebConsoleDestination(destination: string): boolean {
  return isExternalRoleSwitchDestination(destination) || destination === '/admin' || destination.startsWith('/admin/');
}

export function useRoleSwitch() {
  const business = useBusinessMode();
  const { dbRole, setRole } = useRole();
  const { activeTenantId, isExafyAdmin } = useTenant();
  const { roles: grantedRoles } = useMemberships(activeTenantId);
  const { isPatient } = usePatientAccess();
  const [switching, setSwitching] = useState(false);

  const availableRoles = useMemo(
    () => computeAvailableRoles({ granted: grantedRoles, isExafyAdmin, isPatient, isMobile: true }),
    [grantedRoles, isExafyAdmin, isPatient],
  );
  const businessEntries = useMemo(() => computeBusinessEntries(business.orgs), [business.orgs]);

  const switchRole = async (newRole: UserRole): Promise<{ ok: boolean }> => {
    setSwitching(true);
    const result = await setRole(newRole);
    setSwitching(false);
    if (!result.ok) {
      notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
      return { ok: false };
    }
    const destination = getRoleSwitchDestination(newRole);
    if (isWebConsoleDestination(destination)) await openWebConsole(destination);
    else router.navigate(destination as never);
    return { ok: true };
  };

  return {
    availableRoles,
    activeRole: dbRole,
    canSwitch: availableRoles.length > 1 || businessEntries.length > 0,
    switching,
    switchRole,
    businessEntries,
    activeBusinessOrgId: business.isBusinessMode ? (business.activeOrg?.id ?? null) : null,
    switchToBusiness: business.enterBusinessMode,
  };
}
