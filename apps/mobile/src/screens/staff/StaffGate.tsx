/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `<ProtectedRoute
 * requiredRole="staff">` (src/components/ProtectedRoute.tsx) around all eight
 * `/staff/*` routes (src/App.tsx:1754-1810). Same rule as the web: the delayed
 * loader while the role preference resolves for the first time for this
 * member, then `NotAuthorized` (src/pages/NotAuthorized.tsx, the phone
 * branch) unless `ROLE_HIERARCHY[dbRole] >= ROLE_HIERARCHY.staff` or the
 * member is an Exafy admin (src/hooks/useRole.tsx:109-115). A failed
 * `get_role_preference` leaves dbRole at `community` on both platforms, so it
 * lands on NotAuthorized. The first resolution also waits for the active
 * tenant (see `resolving` below). The AuthGate's route guard (the web's
 * `useRoleRouteEnforcement`) runs first in the shell, as on the web.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DelayedLoader, Text, useUITheme } from '../../ports/ui';
import { ROLE_LADDER, type UserRole } from '../../ports/core';
import { StaffIcon } from '../../ports/staff-ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { useRole } from '../../identity/useRole';
import { useTenant } from '../../identity/TenantProvider';
import { navigateToWebPath } from '../../navigation/navigate';

/** `hasPermission('staff')` (web useRole.tsx:109-115; ROLE_LADDER is ROLE_HIERARCHY's order). */
export function hasStaffPermission(dbRole: UserRole, isExafyAdmin: boolean): boolean {
  if (isExafyAdmin) return true;
  return ROLE_LADDER.indexOf(dbRole) >= ROLE_LADDER.indexOf('staff');
}

// ProtectedRoute.tsx `settledFor`: once the role query settled for a member, a later refetch keeps the page mounted.
let settledFor: string | null = null;

export function __resetStaffGateForTests(): void {
  settledFor = null;
}

function NotAuthorizedPanel(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="staff-not-authorized" style={styles.center}>
      <Card style={styles.card}>
        <CardHeader style={styles.centerText}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { borderColor: colors.destructive }]}>
              <View style={[StyleSheet.absoluteFill, styles.iconTint, { backgroundColor: colors.destructive }]} />
              <StaffIcon name="Shield" size={32} color={colors.destructive} />
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
            <Button testID="staff-not-authorized-home" onPress={() => navigateToWebPath('/')}>
              <StaffIcon name="ArrowLeft" size={16} color={colors.primaryForeground} />
              {t('screens.notauthorized.returnDashboard')}
            </Button>
            <Button testID="staff-not-authorized-support" variant="outline" onPress={() => navigateToWebPath('/settings')}>
              {t('screens.notauthorized.contactSupport')}
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

export function StaffGate({ children }: { children: ReactElement }): ReactElement {
  const { t } = useI18n();
  const { user } = useAuth();
  const { isExafyAdmin, activeTenantId } = useTenant();
  const { dbRole, isLoading } = useRole();
  const owner = user?.id ?? '';
  // The role query is disabled until there is a member and TenantProvider has
  // set the active tenant (one render after the session arrives, on both
  // platforms). Counting those renders as "settled" would skip the loader and
  // flash Access Denied — the VTID-03909 flash ProtectedRoute exists to
  // prevent — so they count as loading.
  const resolving = isLoading || !user || !activeTenantId;
  if (!resolving) settledFor = owner;
  if (resolving && settledFor !== owner) {
    return (
      <View testID="staff-gate-loading" style={styles.center}>
        <DelayedLoader accessibilityLabel={t('loading.default')} />
      </View>
    );
  }
  if (!hasStaffPermission(dbRole, isExafyAdmin)) return <NotAuthorizedPanel />;
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
