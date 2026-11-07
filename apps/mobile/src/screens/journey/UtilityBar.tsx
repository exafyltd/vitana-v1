/**
 * VTID-05461 — the My Journey utility bar (AutopilotDashboard.tsx:452-475,
 * mobile `UtilityActionButton compact`), one horizontally scrolling rail in
 * the web order (utility-action-button.tsx:97-123):
 *
 *   ExpandableSearchButton · UniversalCalendarButton  (the page's children)
 *   Life Compass                                     (global, :102-112)
 *   Gift Voucher — hidden where IAP is restricted    (global, :115-117, :43)
 *   VitanaIndexChip · AutopilotChip                  (afterGiftVoucherChildren)
 *
 *  - search: the "Search" pill expands to the field (expandable-search-button.tsx:127-160,
 *    :203-221); matches over the journey's recommendations (title / summary,
 *    ≤ 8) drop down below; a match clears the search and opens the popup;
 *  - calendar (UniversalCalendarButton.tsx): pill → /calendar; the upcoming
 *    count badge (first 10, NotificationBadge 99+ rule) and the pulsing
 *    conflict dot. The web button also listens for `calendar:open` (ORB / deep
 *    links); natively the shell already does (MobileAppShell.tsx:50), so a
 *    second listener here would navigate twice;
 *  - Life Compass: `vitana:open-life-compass` (useLifeCompassPopup);
 *  - gift voucher: the MaxinaVoucherModal twin (VoucherModal.tsx); the iOS
 *    gate is the shell's `iapRestricted` rule (shell/logic/drawer.ts:37-38,
 *    `Platform.OS === 'ios'`), unchanged;
 *  - VitanaIndexChip (MobileActionChips.tsx:18-48): 🧬 + the Index value
 *    ("…" while loading), the 🔥N streak badge from 3 days, opens the Index
 *    sheet (`vitana:open-index`);
 *  - AutopilotChip (:60-82): plane, label, pulsing pending-count badge.
 */
import { useState, type ReactElement } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useUITheme } from '../../ports/ui';
import { alpha, JourneyIcon } from '../../ports/journey';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { useCalendarEvents, useVitanaIndex } from './data/supabase';
import { useVitanaStreaks } from './hooks/useVitanaStreaks';
import { Pulse } from './motion';
import { VoucherModal } from './VoucherModal';

export const LIFE_COMPASS_OPEN = 'vitana:open-life-compass';
export const INDEX_OPEN = 'vitana:open-index';
const CALENDAR_ROUTE = '/calendar';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
}

/** NotificationBadge's count rule (notification-badge.tsx:20-26). */
export function formatNotificationCount(count: number): string {
  if (count === 0) return '';
  if (count < 100) return String(count);
  if (count < 1000) return '99+';
  return '999+';
}

function Pill({ testID, label, onPress, children }: { testID: string; label: string; onPress: () => void; children: ReactElement | ReactElement[] }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.pill, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      {children}
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
      <Pressable testID="journey-calendar-button" accessibilityRole="button" accessibilityLabel={label} onPress={() => navigateToWebPath(CALENDAR_ROUTE)} style={[styles.pill, styles.pillTight, { backgroundColor: alpha(colors.muted, 0.6) }]}>
        <JourneyIcon name="Calendar" size={16} color={colors.foreground} />
        <Text size="sm">{label}</Text>
      </Pressable>
      {upcoming.length > 0 ? (
        <View
          style={[styles.countBadge, { backgroundColor: colors.statusInfo }]}
          accessibilityRole="text"
          accessibilityLabel={t('journeyAutopilotNative.calendar.upcomingCount', { count: upcoming.length })}
          pointerEvents="none"
        >
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText} testID="journey-calendar-count">
            {formatNotificationCount(upcoming.length)}
          </Text>
        </View>
      ) : null}
      {conflictCount > 0 ? (
        <Pulse style={[styles.conflictDot, { backgroundColor: colors.statusWarning, borderColor: colors.background }]} testID="journey-calendar-conflict">
          <View />
        </Pulse>
      ) : null}
    </View>
  );
}

export function VitanaIndexChip(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { index, isLoading } = useVitanaIndex();
  const { current: streakDays } = useVitanaStreaks();
  const showStreak = streakDays >= 3;
  return (
    <View style={styles.badgeHost}>
      <Pressable
        testID="journey-vitana-index-chip"
        accessibilityRole="button"
        accessibilityLabel={showStreak ? t('journeyAutopilotNative.indexChip.openWithStreak', { days: streakDays }) : t('journeyAutopilotNative.indexChip.open')}
        onPress={() => overlayBus.emit(INDEX_OPEN)}
        style={[styles.pill, { backgroundColor: alpha(colors.muted, 0.6) }]}
      >
        <Text size="xs" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          🧬
        </Text>
        <Text size="sm" weight="500" color={colors.primary}>
          {isLoading || !index ? '…' : String(index.total)}
        </Text>
      </Pressable>
      {showStreak ? (
        <View style={[styles.streak, { backgroundColor: colors.statusWarning }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText} testID="journey-vitana-index-streak">
            {`🔥${streakDays}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function AutopilotChip({ pendingCount, onPress }: { pendingCount: number; onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.badgeHost}>
      <Pill testID="journey-autopilot-chip" label={t('actionBar.autopilot')} onPress={onPress}>
        <JourneyIcon name="Plane" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.autopilot')}</Text>
      </Pill>
      {pendingCount > 0 ? (
        <Pulse style={[styles.badge, { backgroundColor: colors.destructive }]} testID="journey-autopilot-chip-count">
          <Text weight="600" color={colors.destructiveForeground} style={styles.badgeText}>
            {String(pendingCount)}
          </Text>
        </Pulse>
      ) : null}
    </View>
  );
}

export function UtilityBar({
  query,
  onQueryChange,
  results,
  onResultPress,
  pendingCount,
  onOpenAutopilot,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchItem[];
  onResultPress: () => void;
  pendingCount: number;
  onOpenAutopilot: () => void;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const iapRestricted = Platform.OS === 'ios';
  const showDropdown = expanded && query.trim().length > 0 && results.length > 0;
  return (
    <View testID="journey-utility-bar" style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rail} testID="journey-utility-rail">
        {expanded ? (
          <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <JourneyIcon name="Search" size={16} color={colors.mutedForeground} />
            <TextInput testID="journey-search-input" value={query} onChangeText={onQueryChange} placeholder={t('screens.autopilotdashboard.searchTasks')} autoFocus style={styles.flex} />
            <Pressable
              testID="journey-search-close"
              accessibilityLabel={t('screens.common.close')}
              hitSlop={8}
              onPress={() => {
                onQueryChange('');
                setExpanded(false);
              }}
            >
              <JourneyIcon name="X" size={12} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <Pressable testID="journey-search-open" accessibilityRole="button" accessibilityLabel={t('screens.autopilotdashboard.searchTasks')} onPress={() => setExpanded(true)} style={[styles.pill, styles.pillTight, { backgroundColor: alpha(colors.muted, 0.6) }]}>
            <JourneyIcon name="Search" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.search')}</Text>
          </Pressable>
        )}
        <CalendarButton />
        <Pill testID="journey-life-compass-button" label={t('lifeCompass.title')} onPress={() => overlayBus.emit(LIFE_COMPASS_OPEN)}>
          <JourneyIcon name="Target" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('lifeCompass.title')}</Text>
        </Pill>
        {!iapRestricted ? (
          <Pill testID="journey-gift-voucher-button" label={t('actionBar.giftVoucher')} onPress={() => setVoucherOpen(true)}>
            <JourneyIcon name="Gift" size={16} color={colors.mutedForeground} />
            <Text size="sm">{t('actionBar.giftVoucher')}</Text>
          </Pill>
        ) : null}
        <VitanaIndexChip />
        <AutopilotChip pendingCount={pendingCount} onPress={onOpenAutopilot} />
      </ScrollView>
      {showDropdown ? (
        <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.popover }]} testID="journey-search-results">
          {results.map((r) => (
            <Pressable
              key={r.id}
              testID={`journey-search-result-${r.id}`}
              accessibilityRole="button"
              onPress={() => {
                setExpanded(false);
                onResultPress();
              }}
              style={styles.result}
            >
              <Text size="sm" weight="500" numberOfLines={1}>
                {r.title}
              </Text>
              <Text size="xs" muted numberOfLines={1}>
                {r.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!iapRestricted ? <VoucherModal open={voucherOpen} onOpenChange={setVoucherOpen} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: 8 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  flex: { flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  pillTight: { paddingHorizontal: 10, gap: 4 },
  search: { width: 256, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 36 },
  badgeHost: { position: 'relative' },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countBadge: { position: 'absolute', top: -6, end: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  streak: { position: 'absolute', top: -4, end: -4, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  conflictDot: { position: 'absolute', top: -6, start: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 10 },
  badgeText: { fontSize: 10, lineHeight: 12 },
  dropdown: { borderWidth: 1, borderRadius: 12, paddingVertical: 4 },
  result: { paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
});
