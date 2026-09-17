/**
 * VTID-03993 — one i18n label per Vitana role, used by every place that
 * names the active role (drawer header, role switcher, profile badge).
 * Replaces the raw-English `ROLE_LABELS` maps that lived in components.
 */
import type { UserRole } from '@/hooks/useRole';
import { t } from '@/lib/i18n-toast';

const ROLE_LABEL_KEY: Record<UserRole, string> = {
  community: 'screens.mobile.roleCommunity',
  patient: 'screens.mobile.rolePatient',
  professional: 'screens.mobile.roleProfessional',
  staff: 'screens.mobile.roleStaff',
  backoffice: 'screens.mobile.roleBackoffice',
  admin: 'screens.mobile.roleAdministrator',
  developer: 'screens.mobile.roleDeveloper',
  infra: 'screens.mobile.roleInfra',
};

export function roleLabel(role: UserRole | string): string {
  const key = ROLE_LABEL_KEY[role as UserRole];
  return key ? t(key) : String(role);
}
