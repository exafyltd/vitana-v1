/**
 * VTID-05186 (N3, plan change 17) — src/components/mobile/MobileAppShell.tsx:
 * TopAppBar + SideDrawer + content (top safe area + 32 px bar) + edge-swipe
 * (same thresholds: start x < 30, dx > 50, dx > |dy|) + BottomNav with the ORB
 * slot; `calendar:open` → /calendar; the delayed loader on the first-ever load
 * until guided mode resolves (AppLayout.tsx:512-516). The edge swipe uses
 * the web's left-edge rule in every direction (plan open question 5 default:
 * mirror what the web renders; recorded as a parity note).
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { DelayedLoader } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useGuidedMode } from '../../identity/GuidedModeProvider';
import { useRoleSwitch } from '../../identity/useRoleSwitch';
import { useRole } from '../../identity/useRole';
import { useBusinessMode } from '../../identity/useBusinessMode';
import { useTenant } from '../../identity/TenantProvider';
import { businessRoleLabelKey } from '../../ports/core';
import { useBusEvent } from '../../navigation/overlay-bus';
import { navigateToWebPath } from '../../navigation/navigate';
import { roleLabel } from '../logic/role-labels';
import { TopAppBar } from './TopAppBar';
import { SideDrawer } from './SideDrawer';
import { BottomNav } from './BottomNav';
import { RoleSwitcherSheet } from './RoleSwitcherSheet';
import { LanguageSheet } from './LanguageSheet';

export const EDGE_START_MAX_X = 30;
export const EDGE_MIN_DX = 50;

/** MobileAppShell.tsx `onEnd`: a swipe from the edge opens the drawer. */
export function isEdgeSwipe(startX: number, deltaX: number, deltaY: number): boolean {
  return startX < EDGE_START_MAX_X && deltaX > EDGE_MIN_DX && deltaX > Math.abs(deltaY);
}

export function MobileAppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { loading: guidedLoading } = useGuidedMode();
  const { switching: tenantSwitching } = useTenant();
  const roleSwitch = useRoleSwitch();
  const { dbRole } = useRole();
  const business = useBusinessMode();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const start = useRef({ x: 0, y: 0 });

  useBusEvent('calendar:open', () => navigateToWebPath('/calendar'));

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .withTestId('shell-edge-swipe')
        .runOnJS(true)
        .onBegin((e) => {
          start.current = { x: e.absoluteX, y: e.absoluteY };
        })
        .onEnd((e) => {
          if (isEdgeSwipe(start.current.x, e.absoluteX - start.current.x, e.absoluteY - start.current.y)) setDrawerOpen(true);
        }),
    [],
  );

  const inBusinessMode = business.isBusinessMode && business.activeOrg !== null;
  const currentModeLabel = inBusinessMode && business.activeOrg ? t(businessRoleLabelKey(business.activeOrg.role)) : roleLabel(t, dbRole);

  return (
    <View style={styles.root} testID="mobile-app-shell">
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <GestureDetector gesture={swipe}>
        <View style={styles.content} testID="shell-content">
          {guidedLoading || tenantSwitching ? <DelayedLoader accessibilityLabel={t('common.loading')} /> : children}
        </View>
      </GestureDetector>
      <BottomNav hiddenBySheet={roleSheetOpen} />
      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenRoleSheet={() => setRoleSheetOpen(true)}
        onOpenLanguage={() => setLanguageOpen(true)}
        canSwitch={roleSwitch.canSwitch}
        onSwitchToCommunity={() => void roleSwitch.switchRole('community')}
      />
      <RoleSwitcherSheet
        open={roleSheetOpen}
        onOpenChange={setRoleSheetOpen}
        availableRoles={roleSwitch.availableRoles}
        activeRole={roleSwitch.activeRole}
        switching={roleSwitch.switching}
        onSelect={async (role) => {
          const r = await roleSwitch.switchRole(role);
          if (r.ok) setRoleSheetOpen(false);
        }}
        businessEntries={roleSwitch.businessEntries}
        activeBusinessOrgId={roleSwitch.activeBusinessOrgId}
        currentModeLabel={currentModeLabel}
        onSelectBusiness={(orgId) => {
          roleSwitch.switchToBusiness(orgId);
          setRoleSheetOpen(false);
        }}
      />
      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
