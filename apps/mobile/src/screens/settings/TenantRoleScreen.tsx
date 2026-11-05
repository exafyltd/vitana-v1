/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings/tenant-role`
 * (SETTINGS.TENANT_ROLE), the native twin of the phone branch of
 * `src/pages/settings/TenantRole.tsx` (Spotlight is desktop-only): the Exafy
 * admin notice, the current context, the role switcher, the organisation
 * switcher (Exafy admins only) and the current role's permissions.
 *
 * Data, as the web page reads it:
 *  - `useMemberships()` WITHOUT a tenant id → the `list_my_memberships`
 *    function (`./data/hooks.ts` `useAllMemberships`). Its `roles` is set only
 *    when that payload is a list of strings, which the function never
 *    returns, so the role list is empty and the switcher shows the "no role
 *    memberships" notice — the page's behaviour today, kept 1:1 (no
 *    redesign); the drawer's role switcher is the working path on the phone.
 *  - `useRole()` — on the phone `currentRole` is the forced `community`
 *    (web `effectiveRole`); `hasPermission` checks the real `dbRole` on the
 *    role ladder, Exafy admins have every permission.
 *  - Role switch → `set_role_preference` (the shell's `useRole().setRole`),
 *    organisation switch → the shell's tenant switch by slug.
 * Loading shows the skeleton the web shows. React 19 `ReactElement`.
 */
import { useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, PressableRow, Skeleton, Text, notify, notifyError, useUITheme } from '../../ports/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SettingsIcon, type SettingsGlyph } from '../../ports/settings-ui';
import { ROLE_LADDER, type UserRole } from '../../ports/core';
import { useI18n } from '../../i18n/I18nProvider';
import { useTenant } from '../../identity/TenantProvider';
import { useRole } from '../../identity/useRole';
import { useAllMemberships } from './data/hooks';

const ROLE_NAMES: Record<string, string> = {
  community: 'settingsNative.tenantRole.roles.community',
  patient: 'settingsNative.tenantRole.roles.patient',
  professional: 'settingsNative.tenantRole.roles.professional',
  staff: 'settingsNative.tenantRole.roles.staff',
  backoffice: 'settingsNative.tenantRole.roles.backoffice',
  admin: 'settingsNative.tenantRole.roles.admin',
};
const ROLE_DESCRIPTIONS: Record<string, string> = {
  community: 'settingsNative.tenantRole.roleDescriptions.community',
  patient: 'settingsNative.tenantRole.roleDescriptions.patient',
  professional: 'settingsNative.tenantRole.roleDescriptions.professional',
  staff: 'settingsNative.tenantRole.roleDescriptions.staff',
  backoffice: 'settingsNative.tenantRole.roleDescriptions.backoffice',
  admin: 'settingsNative.tenantRole.roleDescriptions.admin',
};
const PERMISSIONS: readonly { key: string; role: UserRole }[] = [
  { key: 'settingsNative.tenantRole.permissions.community', role: 'community' },
  { key: 'settingsNative.tenantRole.permissions.health', role: 'patient' },
  { key: 'settingsNative.tenantRole.permissions.professional', role: 'professional' },
  { key: 'settingsNative.tenantRole.permissions.staff', role: 'staff' },
  { key: 'settingsNative.tenantRole.permissions.admin', role: 'admin' },
];

/** `ROLE_HIERARCHY[dbRole] >= ROLE_HIERARCHY[requiredRole]` (web useRole.tsx:109-115). */
export function hasRolePermission(dbRole: UserRole, required: UserRole, isExafyAdmin: boolean): boolean {
  if (isExafyAdmin) return true;
  return ROLE_LADDER.indexOf(dbRole) >= ROLE_LADDER.indexOf(required);
}

function Card({ icon, title, children, testID }: { icon?: SettingsGlyph; title: string; children: ReactElement | (ReactElement | null)[] | null; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID={testID}>
      <View style={styles.inline}>
        {icon ? <SettingsIcon name={icon} size={20} /> : null}
        <Text weight="600" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Notice({ icon, text, testID }: { icon: SettingsGlyph; text: string; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.notice, { borderColor: colors.border }]} testID={testID}>
      <SettingsIcon name={icon} size={16} />
      <Text size="sm" style={styles.fill}>
        {text}
      </Text>
    </View>
  );
}

export function TenantRoleScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { activeTenantId, tenant, isExafyAdmin, setTenantBySlug } = useTenant();
  const { dbRole, setRole, isLoading: roleLoading } = useRole();
  const { memberships, roles, isLoading: membershipsLoading } = useAllMemberships();
  const currentRole: UserRole = 'community';
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTenant, setSelectedTenant] = useState('');
  const [switching, setSwitching] = useState(false);
  const roleName = (r: string) => (ROLE_NAMES[r] ? t(ROLE_NAMES[r]) : r);
  const roleDescription = (r: string) => t(ROLE_DESCRIPTIONS[r] ?? 'settingsNative.tenantRole.roleDescriptions.default');

  const handleRoleSwitch = async () => {
    if (!selectedRole || !activeTenantId) return;
    setSwitching(true);
    try {
      const result = await setRole(selectedRole as UserRole);
      if (result.ok) {
        notify('toasts.settings.roleSwitched');
        setSelectedRole('');
      } else {
        notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
      }
    } catch {
      notifyError('toasts.settings.errorSwitchingRole', 'toasts.settings.failedSwitchRolePleaseTryAgain');
    } finally {
      setSwitching(false);
    }
  };

  const handleTenantSwitch = async () => {
    if (!selectedTenant || !isExafyAdmin) return;
    const slug = memberships?.find((m) => m.tenant_id === selectedTenant)?.tenants?.slug;
    setSwitching(true);
    try {
      const result = slug ? await setTenantBySlug(slug) : { ok: false as const };
      if (!result.ok) throw new Error('tenant switch failed');
      notify('toasts.settings.organizationSwitched');
      setSelectedTenant('');
    } catch {
      notifyError('toasts.settings.errorSwitchingOrganization', 'toasts.settings.failedSwitchOrganizationPleaseTryAgain');
    } finally {
      setSwitching(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header">
        {t('screens.settings.switchRolesTenants')}
      </Text>
      <Text size="sm" muted>
        {t('settingsNative.tenantRole.description')}
      </Text>
    </View>
  );

  if (membershipsLoading || roleLoading) {
    return (
      <View style={[styles.root, styles.content, { backgroundColor: colors.background }]} testID="screen-tenant-role">
        <View style={styles.sections} testID="tenant-role-loading">
          <Skeleton style={styles.skelTitle} />
          <Skeleton style={styles.skelMid} />
          <Skeleton style={styles.skelTall} />
        </View>
      </View>
    );
  }

  const switchLabel = (idle: string) => (switching ? t('settingsNative.tenantRole.switching') : idle);

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} testID="screen-tenant-role">
      {header}
      <View style={styles.sections}>
        {isExafyAdmin ? <Notice icon="Crown" text={t('screens.settings.youExafySuperAdministratorYouCan')} testID="tenant-role-admin-notice" /> : null}

        <Card icon="UserCheck" title={t('screens.settings.currentContext')} testID="tenant-role-context">
          <View style={[styles.context, { backgroundColor: colors.muted }]}>
            <View style={styles.inline}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <SettingsIcon name="Crown" size={20} color={colors.primaryForeground} />
              </View>
              <View>
                <Text weight="500" testID="tenant-role-current-role">
                  {currentRole ? roleName(currentRole) : t('settingsNative.tenantRole.noRoleSelected')}
                </Text>
                <Text size="sm" muted testID="tenant-role-current-tenant">
                  {tenant?.name || t('settingsNative.tenantRole.noOrganization')}
                </Text>
              </View>
            </View>
            <Badge variant="success">{t('screens.settings.active')}</Badge>
          </View>
        </Card>

        <Card icon="Briefcase" title={t('screens.settings.switchRole')} testID="tenant-role-switch-role">
          {roles && roles.length > 0 ? (
            <View style={styles.sections}>
              <View style={styles.field}>
                <Text size="sm" weight="500">
                  {t('screens.settings.availableRoles')}
                </Text>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger testID="tenant-role-role-trigger">
                    <SelectValue placeholder={t('screens.settings.selectRole')} />
                  </SelectTrigger>
                  <SelectContent testID="tenant-role-roles">
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleName(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              {roles.map((r) => {
                const isCurrent = currentRole === r;
                return (
                  <PressableRow key={r} onPress={() => setSelectedRole(r)} testID={`tenant-role-role-${r}`} style={[styles.option, { borderColor: isCurrent ? colors.primary : colors.border }]}>
                    <View style={styles.fill}>
                      <View style={styles.inline}>
                        <SettingsIcon name="Users" size={16} color={isCurrent ? colors.primary : colors.mutedForeground} />
                        <Text weight="500">{roleName(r)}</Text>
                      </View>
                      <Text size="sm" muted>
                        {roleDescription(r)}
                      </Text>
                      <View style={styles.badgeRow}>
                        <Badge variant={isCurrent ? 'success' : 'secondary'}>{isCurrent ? t('settingsNative.tenantRole.current') : t('settingsNative.tenantRole.available')}</Badge>
                      </View>
                    </View>
                  </PressableRow>
                );
              })}
              <Button onPress={() => void handleRoleSwitch()} disabled={!selectedRole || switching || selectedRole === currentRole} testID="tenant-role-switch-role-button">
                {switchLabel(t('screens.settings.switchRole'))}
              </Button>
            </View>
          ) : (
            <Notice icon="AlertCircle" text={t('screens.settings.youDonTHaveAnyRole')} testID="tenant-role-no-roles" />
          )}
        </Card>

        {isExafyAdmin ? (
          <Card icon="Building2" title={t('screens.settings.switchOrganizationAdminOnly')} testID="tenant-role-switch-org">
            {memberships && memberships.length > 0 ? (
              <View style={styles.sections}>
                <View style={styles.field}>
                  <Text size="sm" weight="500">
                    {t('screens.settings.availableOrganizations')}
                  </Text>
                  <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                    <SelectTrigger testID="tenant-role-org-trigger">
                      <SelectValue placeholder={t('screens.settings.selectOrganization')} />
                    </SelectTrigger>
                    <SelectContent testID="tenant-role-orgs">
                      {memberships.map((m) => (
                        <SelectItem key={m.tenant_id} value={m.tenant_id} testID={`tenant-role-org-${m.tenant_id}`}>
                          {m.tenants.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </View>
                {memberships.map((m) => {
                  const isActive = activeTenantId === m.tenant_id;
                  return (
                    <View key={m.tenant_id} style={[styles.option, styles.membership, { borderColor: isActive ? colors.primary : colors.border }]} testID={`tenant-role-membership-${m.tenant_id}`}>
                      <View style={styles.inline}>
                        <SettingsIcon name="Building2" size={16} color={isActive ? colors.primary : colors.mutedForeground} />
                        <View>
                          <Text weight="500">{m.tenants.name}</Text>
                          <Text size="sm" muted>
                            {t('screens.settings.roleValue0', { value0: roleName(m.role) })}
                          </Text>
                        </View>
                      </View>
                      <Badge variant={isActive ? 'success' : 'secondary'}>{isActive ? t('screens.settings.active') : t('settingsNative.tenantRole.available')}</Badge>
                    </View>
                  );
                })}
                <Button onPress={() => void handleTenantSwitch()} disabled={!selectedTenant || switching || selectedTenant === activeTenantId} testID="tenant-role-switch-org-button">
                  {switchLabel(t('settingsNative.tenantRole.switchOrganization'))}
                </Button>
              </View>
            ) : (
              <Notice icon="AlertCircle" text={t('screens.settings.noOrganizationMembershipsFound')} testID="tenant-role-no-orgs" />
            )}
          </Card>
        ) : null}

        <Card title={t('screens.settings.currentRolePermissions')} testID="tenant-role-permissions">
          {PERMISSIONS.map((p) => {
            const granted = hasRolePermission(dbRole, p.role, isExafyAdmin);
            return (
              <View key={p.key} style={[styles.permission, { backgroundColor: colors.muted }]} testID={`tenant-role-permission-${p.role}`}>
                <Text weight="500" style={styles.fill}>
                  {t(p.key)}
                </Text>
                <View style={styles.inline}>
                  <SettingsIcon name={granted ? 'CheckCircle2' : 'XCircle'} size={16} color={granted ? colors.statusSuccess : colors.mutedForeground} />
                  <Badge variant={granted ? 'success' : 'secondary'}>{granted ? t('screens.settings.granted') : t('screens.settings.notAvailable')}</Badge>
                </View>
              </View>
            );
          })}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 96, gap: 24 },
  header: { gap: 4 },
  sections: { gap: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 12, padding: 16 },
  fill: { flex: 1 },
  context: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 8 },
  option: { borderWidth: 1, borderRadius: 8, padding: 16 },
  membership: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  badgeRow: { flexDirection: 'row', marginTop: 8 },
  permission: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  skelTitle: { height: 32, width: '33%', borderRadius: 8 },
  skelMid: { height: 128, borderRadius: 8 },
  skelTall: { height: 192, borderRadius: 8 },
});
