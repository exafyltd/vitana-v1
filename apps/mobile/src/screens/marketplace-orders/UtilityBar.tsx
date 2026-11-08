/**
 * VTID-05511 — twin of the web utility rail (`src/components/ui/utility-action-button.tsx`)
 * and the pills the marketplace / doctors / orders screens put in it. One
 * horizontally scrolling rail, in the web order (:97-123):
 *
 *   children (the page's own pills) · Life Compass · Gift Voucher ·
 *   afterGiftVoucherChildren · trailingElement
 *
 *  - Life Compass (:102-112): opens the global Life Compass popup through
 *    the overlay bus event `vitana:open-life-compass` (the web context's
 *    `openPopup`, the same event the My Journey port emits);
 *  - Gift Voucher (:115-117, `GiftVoucherButton`) emits `gift-voucher:open`
 *    for the shared modal (shell/utility/VoucherModal.tsx, VTID-05653) and is
 *    hidden where IAP is restricted (:43,
 *    `isIAPRestricted()`); natively that is the shell's rule unchanged
 *    (src/shell/logic/drawer.ts:37-38, `Platform.OS === 'ios'`);
 *  - `SearchButton` = `ExpandableSearchButton` (expandable-search-button.tsx):
 *    the "Search" pill with the optional inline filter chip (`filterLabel` +
 *    chevron, :222-233); tapped it becomes the 256-px field with a clear (×)
 *    that collapses it and reports "" (:94-101); every keystroke reports the text;
 *  - `CalendarButton` = `UniversalCalendarButton`: pill → `/calendar`, the
 *    upcoming-count badge (first 10, NotificationBadge's 99+ rule) and the
 *    pulsing conflict dot. Its `calendar:open` listener is the shell's
 *    (MobileAppShell.tsx:50), so it is not registered twice here;
 *  - `VitanaIndexChip` / `AutopilotChip` (src/components/mobile/MobileActionChips.tsx):
 *    🧬 + today's Index ("…" while loading) with the 🔥N streak badge from
 *    3 days, opening the Index sheet (`vitana:open-index`); the plane chip with
 *    the pulsing pending count, opening the Autopilot popup — the same
 *    `autopilot:open` bus event the shell's side drawer emits (SideDrawer.tsx:245);
 *  - `RefreshButton` — the round ghost refresh icon (`window.location.reload()`):
 *    natively it refetches every query of the screen.
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Text, TextInput, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon } from '../../ports/marketplace-orders';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { Pulse } from './components';
import { useAutopilotPendingCount, useCalendarEvents, useVitanaIndexTotal, useVitanaStreak } from './data/chrome';
import { VoucherModal } from '../../shell/utility/VoucherModal';
import { GIFT_VOUCHER_OPEN } from '../../shell/utility/events';

export const LIFE_COMPASS_OPEN = 'vitana:open-life-compass';
export const INDEX_OPEN = 'vitana:open-index';
export const AUTOPILOT_OPEN = 'autopilot:open';
const CALENDAR_ROUTE = '/calendar';

/** `isIAPRestricted()` — today's shell rule (drawer.ts:37-38), unchanged. */
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

export function RailPill({ testID, label, onPress, children, tight }: { testID: string; label: string; onPress: () => void; children: ReactNode; tight?: boolean }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.pill, tight ? styles.pillTight : null, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      {children}
    </Pressable>
  );
}

export function SearchButton({
  placeholder,
  onSearch,
  filterLabel,
  onFilterClick,
  testID = 'mo-search',
}: {
  placeholder?: string;
  onSearch?: (q: string) => void;
  filterLabel?: string;
  onFilterClick?: () => void;
  testID?: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  if (expanded) {
    return (
      <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.background }]} testID={`${testID}-field`}>
        <CommerceIcon name="Search" size={16} color={colors.mutedForeground} />
        <TextInput
          testID={`${testID}-input`}
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            onSearch?.(v);
          }}
          onSubmitEditing={() => {
            if (query.trim()) onSearch?.(query.trim());
          }}
          placeholder={placeholder || `${t('actionBar.search')}…`}
          autoFocus
          style={styles.flex}
        />
        <Pressable
          testID={`${testID}-close`}
          accessibilityRole="button"
          accessibilityLabel={t('screens.common.close')}
          hitSlop={8}
          onPress={() => {
            setExpanded(false);
            setQuery('');
            onSearch?.('');
          }}
        >
          <CommerceIcon name="X" size={12} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={[styles.searchPill, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      <Pressable testID={`${testID}-open`} accessibilityRole="button" accessibilityLabel={placeholder || t('actionBar.search')} onPress={() => setExpanded(true)} style={styles.searchHalf}>
        <CommerceIcon name="Search" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.search')}</Text>
      </Pressable>
      {filterLabel && onFilterClick ? (
        <>
          <View style={[styles.divider, { backgroundColor: alpha(colors.border, 0.6) }]} />
          <Pressable testID={`${testID}-filter`} accessibilityRole="button" accessibilityLabel={filterLabel} onPress={onFilterClick} style={styles.searchHalf}>
            <Text size="sm" weight="500">
              {filterLabel}
            </Text>
            <CommerceIcon name="ChevronDown" size={12} color={colors.mutedForeground} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export function CalendarButton(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { upcoming, conflictCount } = useCalendarEvents();
  const label = t('actionBar.calendar');
  return (
    <View>
      <RailPill testID="mo-calendar-button" label={label} onPress={() => navigateToWebPath(CALENDAR_ROUTE)} tight>
        <CommerceIcon name="Calendar" size={16} color={colors.foreground} />
        <Text size="sm">{label}</Text>
      </RailPill>
      {upcoming.length > 0 ? (
        <View
          style={[styles.countBadge, { backgroundColor: colors.statusInfo }]}
          accessibilityLabel={t('discoverCommerceNative.marketplaceOrders.utility.upcomingEvents', { count: upcoming.length })}
          pointerEvents="none"
          testID="mo-calendar-count"
        >
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText}>
            {formatNotificationCount(upcoming.length)}
          </Text>
        </View>
      ) : null}
      {conflictCount > 0 ? <Pulse style={[styles.conflictDot, { borderColor: colors.background, backgroundColor: colors.statusWarning }]} testID="mo-calendar-conflict" /> : null}
    </View>
  );
}

export function VitanaIndexChip(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { total, isLoading } = useVitanaIndexTotal();
  const streak = useVitanaStreak();
  const showStreak = streak >= 3;
  return (
    <View>
      <RailPill
        testID="mo-index-chip"
        label={showStreak ? t('discoverCommerceNative.marketplaceOrders.utility.openIndexStreak', { days: streak }) : t('discoverCommerceNative.marketplaceOrders.utility.openIndex')}
        onPress={() => overlayBus.emit(INDEX_OPEN)}
      >
        <Text size="xs" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          🧬
        </Text>
        <Text size="sm" weight="500" color={colors.primary} testID="mo-index-value">
          {isLoading || total == null ? '…' : String(total)}
        </Text>
      </RailPill>
      {showStreak ? (
        <View style={[styles.streak, { backgroundColor: colors.statusWarning }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText} testID="mo-index-streak">
            {`🔥${streak}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function AutopilotChip({ pendingCount }: { pendingCount: number }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View>
      <RailPill testID="mo-autopilot-chip" label={t('actionBar.autopilot')} onPress={() => overlayBus.emit(AUTOPILOT_OPEN)}>
        <CommerceIcon name="Plane" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.autopilot')}</Text>
      </RailPill>
      {pendingCount > 0 ? (
        <Pulse style={[styles.badge, { backgroundColor: colors.destructive }]} testID="mo-autopilot-count">
          <Text weight="600" color={colors.destructiveForeground} style={styles.badgeText}>
            {String(pendingCount)}
          </Text>
        </Pulse>
      ) : null}
    </View>
  );
}

/** `VitanaIndexChip` + `AutopilotChip` as the phone screens pass them (afterGiftVoucherChildren). */
export function MobileActionChips(): ReactElement {
  const pending = useAutopilotPendingCount();
  return (
    <>
      <VitanaIndexChip />
      <AutopilotChip pendingCount={pending} />
    </>
  );
}

export function RefreshButton(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const queryClient = useQueryClient();
  return (
    <Pressable
      testID="mo-refresh"
      accessibilityRole="button"
      accessibilityLabel={t('screens.discover.refreshPage')}
      onPress={() => void queryClient.invalidateQueries()}
      style={styles.round}
    >
      <CommerceIcon name="RefreshCw" size={16} color={colors.foreground} />
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
  /** The screen the voucher checkout returns to. */
  returnTo: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const hideVoucher = isIAPRestricted();
  // VTID-05653: the host in shell/OverlayHost.tsx opens the one voucher modal; with no host
  // registered (a screen rendered on its own) the rail opens the shared modal itself.
  const openVoucher = () => {
    if (overlayBus.listenerCount(GIFT_VOUCHER_OPEN) > 0) overlayBus.emit(GIFT_VOUCHER_OPEN, { returnTo });
    else setVoucherOpen(true);
  };
  return (
    <View style={compact ? styles.compact : styles.regular} testID="mo-utility-bar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rail} testID="mo-utility-rail">
        {children}
        <RailPill testID="mo-life-compass" label={t('lifeCompass.title')} onPress={() => overlayBus.emit(LIFE_COMPASS_OPEN)}>
          <CommerceIcon name="Target" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('lifeCompass.title')}</Text>
        </RailPill>
        {!hideVoucher ? (
          <RailPill testID="mo-gift-voucher" label={t('actionBar.giftVoucher')} onPress={openVoucher}>
            <CommerceIcon name="Gift" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.giftVoucher')}</Text>
          </RailPill>
        ) : null}
        {afterGiftVoucher}
        {trailing}
      </ScrollView>
      {!hideVoucher ? <VoucherModal open={voucherOpen} onOpenChange={setVoucherOpen} returnTo={returnTo} testIDPrefix="mo-" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { paddingVertical: 8 },
  regular: { paddingTop: 16, paddingBottom: 20 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  flex: { flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  pillTight: { paddingHorizontal: 10, gap: 4 },
  searchPill: { flexDirection: 'row', alignItems: 'center', height: 36, borderRadius: 999, overflow: 'hidden' },
  searchHalf: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10 },
  divider: { width: 1, height: 16 },
  search: { width: 256, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 36 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countBadge: { position: 'absolute', top: -6, end: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  streak: { position: 'absolute', top: -4, end: -4, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  conflictDot: { position: 'absolute', top: -6, start: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 10 },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
