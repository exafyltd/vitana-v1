/**
 * VTID-05186 (N3, plan change 18) — src/components/mobile/RoleSwitcherSheet.tsx:
 * a bottom sheet with the current-mode line, the switch hint, one radiogroup
 * for the Vitana modes and one for the businesses; exactly one entry checked.
 * While it is open the shell hides the ORB slot and the bottom bar
 * (business-modes.test.ts). Logic pinned in scripts/native/shell-pins.json.
 */
import { View } from 'react-native';
import { BottomSheet, RadioGroup, Text } from '../../ports/ui';
import { businessRoleLabelKey, type BusinessSwitchEntry, type UserRole } from '../../ports/core';
import { useI18n } from '../../i18n/I18nProvider';
import { roleLabel } from '../logic/role-labels';

export function RoleSwitcherSheet({
  open,
  onOpenChange,
  availableRoles,
  activeRole,
  switching,
  onSelect,
  businessEntries = [],
  activeBusinessOrgId = null,
  onSelectBusiness,
  currentModeLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableRoles: UserRole[];
  activeRole: UserRole;
  switching: boolean;
  onSelect: (role: UserRole) => void;
  businessEntries?: BusinessSwitchEntry[];
  activeBusinessOrgId?: string | null;
  onSelectBusiness?: (orgId: string) => void;
  currentModeLabel?: string;
}) {
  const { t } = useI18n();
  const inBusiness = activeBusinessOrgId !== null;
  const activeBusiness = inBusiness ? (businessEntries.find((e) => e.orgId === activeBusinessOrgId) ?? null) : null;
  const activeModeLabel = activeBusiness ? `${t(businessRoleLabelKey(activeBusiness.role))} · ${activeBusiness.orgName}` : (currentModeLabel ?? roleLabel(t, activeRole));

  return (
    <BottomSheet testID="role-switcher" open={open} onClose={() => onOpenChange(false)} title={t('screens.profile.switchRole')}>
      <Text style={{ fontWeight: '600' }} testID="role-switcher-current">
        {t('screens.mobile.currentModeIs', { role: activeModeLabel })}
      </Text>
      <Text variant="caption" muted style={{ paddingBottom: 8 }}>
        {t('screens.mobile.switchRoleHint')}
      </Text>
      <RadioGroup
        testID="role-switcher-roles"
        accessibilityLabel={t('screens.profile.switchRole')}
        disabled={switching}
        value={inBusiness ? null : activeRole}
        onChange={(v) => onSelect(v as UserRole)}
        options={availableRoles.map((r) => ({ value: r, label: roleLabel(t, r) }))}
      />
      {businessEntries.length > 0 ? (
        <View style={{ paddingTop: 16, gap: 4 }}>
          <Text variant="label" muted>
            {t('screens.mobile.businessModesTitle')}
          </Text>
          <RadioGroup
            testID="role-switcher-businesses"
            accessibilityLabel={t('screens.mobile.businessModesTitle')}
            disabled={switching}
            value={activeBusinessOrgId}
            onChange={(orgId) => onSelectBusiness?.(orgId)}
            options={businessEntries.map((e) => ({ value: e.orgId, label: t(businessRoleLabelKey(e.role)), subtitle: e.orgName }))}
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}
