/**
 * VTID-03993 — the one role-switch code path for desktop AND mobile.
 *
 * Extracted from ProfileDrawer.tsx so the mobile switcher (drawer header
 * pill + profile badge) and the desktop <Select> share the same list and
 * the same write. The stored preference (`role_preferences`, read as
 * `useRole().dbRole`) is the active MODE on every viewport — routing
 * already treats it that way on mobile (VTID-03936); what mobile lacked
 * was a way to change it.
 *
 * Available roles = get_my_permitted_roles (via useMemberships) ∪ {community}
 * ∪ {patient if patient_profiles says so}. The patient union matters:
 * `user_permitted_roles` is a plain table the health-order trigger never
 * writes (it bumps `memberships.role`), so the RPC alone would never list
 * Patient for an automatically activated patient.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole, type UserRole } from '@/hooks/useRole';
import { useTenant } from '@/hooks/useTenant';
import { useMemberships } from '@/hooks/useMemberships';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePatientAccess } from '@/hooks/usePatientAccess';
import { getRoleSwitchDestination, isExternalRoleSwitchDestination } from '@/lib/role-switch-destination';
import { notifyError } from '@/lib/i18n-toast';

export const ROLE_LADDER: UserRole[] = ['community', 'patient', 'professional', 'staff', 'backoffice', 'admin', 'developer', 'infra'];

// VTID-01230 safety net: an Exafy super-admin always sees every role, even
// if the RPC is unavailable — the switcher must never disappear for them.
export const ALL_ROLES_SUPER_ADMIN: UserRole[] = ROLE_LADDER;

// No phone-sized home: BackOffice is desktop-only (VTID-03973), developer and
// infra land on the gateway's external Command Hub.
export const MOBILE_EXCLUDED_ROLES: UserRole[] = ['backoffice', 'developer', 'infra'];

const isUserRole = (r: string): r is UserRole => (ROLE_LADDER as string[]).includes(r);

export function computeAvailableRoles(input: {
  granted: readonly string[] | undefined;
  isExafyAdmin: boolean;
  isPatient: boolean;
  isMobile: boolean;
}): UserRole[] {
  const set = new Set<UserRole>(input.isExafyAdmin ? ALL_ROLES_SUPER_ADMIN : (input.granted ?? []).filter(isUserRole));
  // Everyone is a community member by definition — it must always be a way back.
  set.add('community');
  if (input.isPatient) set.add('patient');
  return ROLE_LADDER.filter((r) => set.has(r) && !(input.isMobile && MOBILE_EXCLUDED_ROLES.includes(r)));
}

export function useRoleSwitch() {
  const navigate = useNavigate();
  const { dbRole, setRole } = useRole();
  const { activeTenantId, isExafyAdmin } = useTenant();
  const { roles: grantedRoles } = useMemberships(activeTenantId || undefined);
  const { isPatient } = usePatientAccess();
  const isMobile = useIsMobile();
  const [switching, setSwitching] = useState(false);

  const availableRoles = useMemo(
    () => computeAvailableRoles({ granted: grantedRoles, isExafyAdmin, isPatient, isMobile }),
    [grantedRoles, isExafyAdmin, isPatient, isMobile],
  );

  // Always writes and navigates, even for the already-active role — picking
  // your current mode is "take me to its home", the same contract the
  // desktop <Select> had before this hook existed (pinned by
  // ProfileDrawer.test.tsx's community → /home case).
  const switchRole = async (newRole: UserRole): Promise<{ ok: boolean }> => {
    // VTID-03909: navigate only once the write is confirmed — a hard
    // navigation mid-RPC used to cancel the write and look like success.
    setSwitching(true);
    const result = await setRole(newRole);
    setSwitching(false);
    if (!result.ok) {
      notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
      return { ok: false };
    }
    const destination = getRoleSwitchDestination(newRole);
    // VTID-03916/03924: in-app destinations use the router; developer/infra
    // point at the cross-origin Command Hub and need a real navigation.
    if (isExternalRoleSwitchDestination(destination)) {
      window.location.assign(destination);
    } else {
      navigate(destination);
    }
    return { ok: true };
  };

  return {
    availableRoles,
    activeRole: dbRole,
    canSwitch: availableRoles.length > 1,
    switching,
    switchRole,
  };
}
