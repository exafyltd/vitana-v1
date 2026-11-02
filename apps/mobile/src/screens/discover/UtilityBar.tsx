/**
 * VTID-05510 — twin of the web utility rail (src/components/ui/utility-action-button.tsx)
 * with the pills the Discover screens put in it. One horizontally scrolling
 * rail in the web order (:97-123):
 *
 *   children (the page's pills) · Life Compass · Gift Voucher ·
 *   afterGiftVoucherChildren · trailingElement
 *
 *  - `SearchButton` (expandable-search-button.tsx): the "Search" pill; tapped
 *    it becomes the 256-pt field (auto-focus) with the × that collapses it;
 *    the Discover pages pass no `onSearch`, so the text filters nothing,
 *    exactly as on the web;
 *  - `CalendarButton` (UniversalCalendarButton.tsx): pill → `/calendar`, the
 *    upcoming-count badge (first 10, NotificationBadge's 99+ rule) and the
 *    pulsing conflict dot. Its `calendar:open` listener is the shell's
 *    (MobileAppShell.tsx), so it is not registered twice here;
 *  - Life Compass (:102-112): the global Life Compass popup. When a global
 *    host listens for `vitana:open-life-compass` (LifeCompassPopupContext.tsx:14)
 *    the pill emits it; with none registered (today's shell) the rail opens
 *    its own LifeCompassPopup twin;
 *  - Gift Voucher (:115-117) + `MaxinaVoucherModal` (VoucherModal.tsx), hidden
 *    where IAP is restricted (`isIAPRestricted()`, :43). Natively that is the
 *    shell's `iapRestricted` rule, unchanged: `Platform.OS === 'ios'`
 *    (src/shell/logic/drawer.ts:37-38);
 *  - `IndexPill` (Discover.tsx:357-367): 🧬 + today's Vitana Index ("…" while
 *    loading, VitanaIndexValue) → `/health`;
 *  - `AutopilotPill` (Discover.tsx:369-386): plane + "Autopilot" and the
 *    pulsing destructive pending-count badge; opens the Autopilot popup
 *    through the `autopilot:open` bus event (the shell drawer's event);
 *  - `ActionButton` (Supplements / Wellness / Deals): "+ Action" opens the
 *    page's quick-actions dialog;
 *  - `RefreshButton`: the round refresh icon (`window.location.reload()`);
 *    natively it refetches the screen's queries.
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon } from '../../ports/discover';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { useCalendarEvents, useVitanaIndex } from './data/utility';
import { LifeCompassPopup } from './LifeCompassPopup';
import { VoucherModal } from './VoucherModal';

export const LIFE_COMPASS_OPEN = 'vitana:open-life-compass';
export const AUTOPILOT_OPEN = 'autopilot:open';
const CALENDAR_ROUTE = '/calendar';

/** `isIAPRestricted()` — the shell's rule (drawer.ts:37-38), unchanged. */
export function isIAPRestricted(): boolean {
  return Platform.OS === 'ios';
}

/** NotificationBadge's count text (notification-badge.tsx:20-26). */
export function formatNotificationCount(count: number): string {
  if (count === 0) return '';
  if (count < 100) return String(count);
  if (count < 1000) return '99+';
  return '999+';
}

/** The web `animate-pulse` (opacity 1 → .5 → 1, 2 s). */
export function Pulse({ children, style, testID }: { children?: ReactNode; style?: object; testID?: string }): ReactElement {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View testID={testID} pointerEvents="none" style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

export function RailPill({ testID, label, onPress, children }: { testID: string; label: string; onPress: () => void; children: ReactNode }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.pill, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      {children}
    </Pressable>
  );
}

export function SearchButton({ placeholder, testID = 'discover-search' }: { placeholder?: string; testID?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  if (expanded) {
    return (
      <View style={[styles.search, { borderColor: colors.input, backgroundColor: colors.background }]} testID={`${testID}-field`}>
        <DiscoverIcon name="Search" size={16} color={colors.mutedForeground} />
        <TextInput testID={`${testID}-input`} value={query} onChangeText={setQuery} placeholder={placeholder || `${t('actionBar.search')}…`} autoFocus style={styles.flex} />
        <Pressable
          testID={`${testID}-close`}
          accessibilityRole="button"
          accessibilityLabel={t('screens.common.close')}
          hitSlop={8}
          onPress={() => {
            setQuery('');
            setExpanded(false);
          }}
        >
          <DiscoverIcon name="X" size={12} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable testID={`${testID}-open`} accessibilityRole="button" accessibilityLabel={t('actionBar.search')} onPress={() => setExpanded(true)} style={[styles.pill, styles.pillTight, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      <DiscoverIcon name="Search" size={16} color={colors.mutedForeground} />
      <Text size="sm">{t('actionBar.search')}</Text>
    </Pressable>
  );
}

export function CalendarButton(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { upcoming, conflictCount } = useCalendarEvents();
  const label = t('actionBar.calendar');
  return (
    <View style={styles.badgeHost}>
      <Pressable testID="discover-calendar-button" accessibilityRole="button" accessibilityLabel={label} onPress={() => navigateToWebPath(CALENDAR_ROUTE)} style={[styles.pill, styles.pillTight, { backgroundColor: alpha(colors.muted, 0.6) }]}>
        <DiscoverIcon name="Calendar" size={16} color={colors.foreground} />
        <Text size="sm">{label}</Text>
      </Pressable>
      {upcoming.length > 0 ? (
        <View
          style={[styles.countBadge, { backgroundColor: colors.statusInfo }]}
          accessibilityRole="text"
          accessibilityLabel={t('discoverCommerceNative.calendar.upcomingCount', { count: upcoming.length })}
          pointerEvents="none"
          testID="discover-calendar-count"
        >
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText}>
            {formatNotificationCount(upcoming.length)}
          </Text>
        </View>
      ) : null}
      {conflictCount > 0 ? <Pulse style={[styles.conflictDot, { backgroundColor: colors.statusWarning, borderColor: colors.background }]} testID="discover-calendar-conflict" /> : null}
    </View>
  );
}

export function IndexPill(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { index, isLoading } = useVitanaIndex();
  const value = isLoading || !index ? '…' : String(index.total);
  return (
    <RailPill testID="discover-index-pill" label={t('discoverCommerceNative.indexPill', { value })} onPress={() => navigateToWebPath('/health')}>
      <Text size="xs" style={styles.dim} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        🧬
      </Text>
      <Text size="sm" weight="500" color={colors.primary}>
        {value}
      </Text>
    </RailPill>
  );
}

export function AutopilotPill({ pendingCount }: { pendingCount: number }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.badgeHost}>
      <RailPill testID="discover-autopilot-pill" label={t('actionBar.autopilot')} onPress={() => overlayBus.emit(AUTOPILOT_OPEN)}>
        <DiscoverIcon name="Plane" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.autopilot')}</Text>
      </RailPill>
      {pendingCount > 0 ? (
        <Pulse style={[styles.badge, { backgroundColor: colors.destructive }]} testID="discover-autopilot-count">
          <Text weight="600" color={colors.destructiveForeground} style={styles.badgeText}>
            {String(pendingCount)}
          </Text>
        </Pulse>
      ) : null}
    </View>
  );
}

export function ActionButton({ onPress }: { onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Pressable testID="discover-action-button" accessibilityRole="button" accessibilityLabel={t('screens.discover.action')} onPress={onPress} style={[styles.action, { backgroundColor: colors.primary }]}>
      <DiscoverIcon name="Plus" size={16} color={colors.primaryForeground} />
      <Text size="sm" weight="500" color={colors.primaryForeground}>
        {t('screens.discover.action')}
      </Text>
    </Pressable>
  );
}

export function RefreshButton({ onPress }: { onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Pressable testID="discover-refresh" accessibilityRole="button" accessibilityLabel={t('screens.discover.refreshPage')} onPress={onPress} style={styles.round}>
      <DiscoverIcon name="RefreshCw" size={16} color={colors.foreground} />
    </Pressable>
  );
}

export function UtilityBar({
  children,
  afterGiftVoucher,
  trailing,
  compact = false,
  returnTo,
}: {
  children: ReactNode;
  afterGiftVoucher?: ReactNode;
  trailing?: ReactNode;
  compact?: boolean;
  /** The voucher checkout's return route (the web `pathname + search`). */
  returnTo: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [compassOpen, setCompassOpen] = useState(false);
  const hideVoucher = isIAPRestricted();
  const openLifeCompass = () => {
    if (overlayBus.listenerCount(LIFE_COMPASS_OPEN) > 0) overlayBus.emit(LIFE_COMPASS_OPEN);
    else setCompassOpen(true);
  };
  return (
    <View testID="discover-utility-bar" style={compact ? styles.wrapCompact : styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rail} testID="discover-utility-rail">
        {children}
        <RailPill testID="discover-life-compass" label={t('lifeCompass.title')} onPress={openLifeCompass}>
          <DiscoverIcon name="Target" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('lifeCompass.title')}</Text>
        </RailPill>
        {!hideVoucher ? (
          <RailPill testID="discover-gift-voucher" label={t('actionBar.giftVoucher')} onPress={() => setVoucherOpen(true)}>
            <DiscoverIcon name="Gift" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.giftVoucher')}</Text>
          </RailPill>
        ) : null}
        {afterGiftVoucher}
        {trailing}
      </ScrollView>
      {!hideVoucher ? <VoucherModal open={voucherOpen} onOpenChange={setVoucherOpen} returnTo={returnTo} /> : null}
      {compassOpen ? <LifeCompassPopup open={compassOpen} onOpenChange={setCompassOpen} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 16, paddingBottom: 20 },
  wrapCompact: { paddingVertical: 8 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  pillTight: { paddingHorizontal: 10, gap: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 12, borderRadius: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  search: { width: 256, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 36 },
  badgeHost: { position: 'relative' },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countBadge: { position: 'absolute', top: -6, end: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  conflictDot: { position: 'absolute', top: -6, start: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 10 },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
