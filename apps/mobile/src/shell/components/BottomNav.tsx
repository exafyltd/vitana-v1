/**
 * VTID-05186 (N3, plan change 18) — src/components/mobile/MobileBottomNav.tsx:
 * business → role → community bar, five equal columns with the ORB slot in the
 * centre, NavLink-style active state with an underline, the inbox unread badge
 * (i18n label `native.a11y.unread`), hidden per `shouldHideBottomNav`. Taps
 * go through navigateToWebPath (no tab state: the web remounts per tap).
 */
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CountBadge, Icon, PressableRow, Text, useUITheme } from '../../ports/ui';
import { OrbSlot } from '../../ports/orb-slot';
import { useBadge } from '../../ports/badges';
import { useI18n } from '../../i18n/I18nProvider';
import { useRole } from '../../identity/useRole';
import { useBusinessMode } from '../../identity/useBusinessMode';
import { navigateToWebPath } from '../../navigation/navigate';
import { barItemActive, resolveBottomNav, shouldHideBottomNav, type BarItem } from '../logic/bottom-nav';

export function useBottomNavState(hiddenBySheet: boolean) {
  const pathname = usePathname();
  const { dbRole } = useRole();
  const business = useBusinessMode();
  const bar = resolveBottomNav(dbRole, business.isBusinessMode && business.activeOrg ? { role: business.activeOrg.role } : null);
  const hidden = shouldHideBottomNav(pathname, bar.businessItems !== null || bar.roleItems !== null);
  return { pathname, items: bar.items, visible: !hidden && !hiddenBySheet, hiddenByRoute: hidden };
}

function NavItem({ item, active, unread }: { item: BarItem; active: boolean; unread: number }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <PressableRow
      testID={`bottom-nav-${item.id}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(item.i18nKey)}
      onPress={() => navigateToWebPath(item.path)}
      style={styles.item}
    >
      <View style={styles.itemInner}>
        <View style={{ opacity: active ? 1 : 0.5 }}>
          <Icon name={item.icon} size={20} color={colors.foreground} />
          {item.id === 'inbox' ? <CountBadge testID="bottom-nav-inbox-badge" count={unread} accessibilityLabel={t('native.a11y.unread', { count: unread })} /> : null}
        </View>
        <Text style={[styles.label, { fontWeight: active ? '600' : '500', opacity: active ? 1 : 0.6 }]}>{t(item.i18nKey)}</Text>
        {active ? <View testID={`bottom-nav-${item.id}-active`} style={[styles.underline, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </PressableRow>
  );
}

export function BottomNav({ hiddenBySheet }: { hiddenBySheet: boolean }) {
  const { colors } = useUITheme();
  const insets = useSafeAreaInsets();
  const unread = useBadge('inboxUnread');
  const { pathname, items, visible } = useBottomNavState(hiddenBySheet);
  if (!visible) return null;
  const cell = (item: BarItem) => <NavItem key={item.id} item={item} active={barItemActive(pathname, item)} unread={item.id === 'inbox' ? unread : 0} />;
  return (
    <View testID="bottom-nav" accessibilityRole="tablist" style={[styles.bar, { paddingBottom: insets.bottom, backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {items.slice(0, 2).map(cell)}
      <View style={styles.orb}>
        <OrbSlot bottomNavVisible={visible} hiddenBySheet={hiddenBySheet} />
      </View>
      {items.slice(2).map(cell)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, justifyContent: 'center', paddingVertical: 4 },
  itemInner: { alignItems: 'center', gap: 2 },
  label: { fontSize: 12 },
  underline: { position: 'absolute', bottom: -2, width: 16, height: 2, borderRadius: 1 },
  orb: { flex: 1, alignItems: 'center' },
});
