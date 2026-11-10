/**
 * VTID-05525 (Native Wave 2, role-modes patient lane) — `<ProtectedRoute
 * requiredRole="patient">` (src/components/ProtectedRoute.tsx) around seven of
 * the eight `/patient/*` routes (src/App.tsx:1631-1688; `/patient/results` is
 * AuthGuard only, VTID-03988). Same rule as the web: the delayed loader while
 * the role preference resolves for the first time for this member, then
 * `NotAuthorized` (src/pages/NotAuthorized.tsx, the phone branch) unless
 * `ROLE_HIERARCHY[dbRole] >= ROLE_HIERARCHY.patient` or the member is an Exafy
 * admin (src/hooks/useRole.tsx:109-115). The AuthGate's route guard (the
 * web's `useRoleRouteEnforcement`) runs first in the shell, as on the web.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DelayedLoader, Text, useUITheme } from '../../ports/ui';
import { ROLE_LADDER, type UserRole } from '../../ports/core';
import { PatientIcon } from '../../ports/patient-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useRole } from '../../identity/useRole';
import { useTenant } from '../../identity/TenantProvider';
import { navigateToWebPath } from '../../navigation/navigate';

/** `hasPermission(requiredRole)` (web useRole.tsx:109-115). */
export function hasRolePermission(dbRole: UserRole, required: UserRole, isExafyAdmin: boolean): boolean {
  if (isExafyAdmin) return true;
  return ROLE_LADDER.indexOf(dbRole) >= ROLE_LADDER.indexOf(required);
}

// ProtectedRoute.tsx `settledFor`: once the role query settled for a member, a later refetch keeps the page mounted.
let settledFor: string | null = null;

export function __resetPatientGateForTests(): void {
  settledFor = null;
}

export function NotAuthorizedPanel(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="patient-not-authorized" style={styles.center}>
      <Card style={styles.card}>
        <CardHeader style={styles.centerText}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { borderColor: colors.destructive }]}>
              <View style={[StyleSheet.absoluteFill, styles.iconTint, { backgroundColor: colors.destructive }]} />
              <PatientIcon name="Shield" size={32} color={colors.destructive} />
            </View>
          </View>
          <CardTitle style={styles.textCenter}>{t('screens.notauthorized.accessDenied')}</CardTitle>
          <CardDescription style={styles.textCenter}>{t('screens.notauthorized.youDonTHavePermissionAccess')}</CardDescription>
        </CardHeader>
        <CardContent style={styles.content}>
          <Text size="sm" muted style={styles.textCenter}>
            {t('screens.notauthorized.error403Forbidden')}
          </Text>
          <View style={styles.buttons}>
            <Button testID="patient-not-authorized-home" onPress={() => navigateToWebPath('/')}>
              <PatientIcon name="ArrowLeft" size={16} color={colors.primaryForeground} />
              {t('screens.notauthorized.returnDashboard')}
            </Button>
            <Button testID="patient-not-authorized-support" variant="outline" onPress={() => navigateToWebPath('/settings')}>
              {t('screens.notauthorized.contactSupport')}
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

export function PatientGate({ children }: { children: ReactElement }): ReactElement {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isExafyAdmin, activeTenantId } = useTenant();
  const { dbRole, isLoading } = useRole();
  const owner = user?.id ?? '';
  // Native difference: TenantProvider sets activeTenantId in an effect after
  // the session arrives, and the role query is disabled until then (it reads
  // as "not loading" with the community default). Counting that gap (and the
  // session itself, which the web's AuthGuard waits for) as loading keeps a
  // patient's cold start from flashing Access denied.
  const resolving = isLoading || !user || !activeTenantId;
  if (!resolving) settledFor = owner;
  if (resolving && settledFor !== owner) {
    return (
      <View testID="patient-gate-loading" style={styles.center}>
        <DelayedLoader accessibilityLabel={t('loading.default')} />
      </View>
    );
  }
  if (!hasRolePermission(dbRole, 'patient', isExafyAdmin)) return <NotAuthorizedPanel />;
  return children;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 448 },
  centerText: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconCircle: { padding: 12, borderRadius: 999, borderWidth: 1, overflow: 'hidden' },
  iconTint: { opacity: 0.1 },
  content: { gap: 16 },
  buttons: { gap: 8 },
});
