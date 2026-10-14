/**
 * VTID-05186 (N3) — src/lib/role-labels.ts `ROLE_LABEL_KEY` (one catalog key
 * per Vitana role). Pinned in scripts/native/shell-pins.json.
 */
import type { UserRole } from '../../ports/core';

export const ROLE_LABEL_KEY: Record<UserRole, string> = {
  community: 'screens.mobile.roleCommunity',
  patient: 'screens.mobile.rolePatient',
  professional: 'screens.mobile.roleProfessional',
  staff: 'screens.mobile.roleStaff',
  backoffice: 'screens.mobile.roleBackoffice',
  admin: 'screens.mobile.roleAdministrator',
  developer: 'screens.mobile.roleDeveloper',
  infra: 'screens.mobile.roleInfra',
};

export function roleLabel(t: (key: string) => string, role: UserRole | string): string {
  const key = ROLE_LABEL_KEY[role as UserRole];
  return key ? t(key) : String(role);
}
