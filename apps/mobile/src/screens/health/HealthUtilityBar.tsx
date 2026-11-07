/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) fix 1 — the /health
 * utility bar, a self-contained twin of the mobile-web rail
 * (`Health.tsx:303-333` inside `UtilityActionButton`,
 * `src/components/ui/utility-action-button.tsx:99-125`). Order, as on web:
 * the page's children (Search, mode pill, Calendar, Upload), then the global
 * Life Compass and Gift Voucher buttons, then `afterGiftVoucherChildren`
 * (the Vitana Index and Autopilot chips).
 *
 *  - ExpandableSearchButton (`expandable-search-button.tsx`): the collapsed
 *    "Search" pill expands to an input with the page placeholder and a ✕
 *    that collapses and clears it. Inert, like the web page: Health.tsx:316
 *    passes no `onSearch`, so nothing reads the query.
 *  - UniversalCalendarButton (`UniversalCalendarButton.tsx:59-87`): opens
 *    `/calendar` (CALENDAR_ROUTE) through `navigateToWebPath`, i.e. the
 *    native calendar route once it exists, the resolver's Unported screen
 *    until then; the upcoming-events badge (getUpcomingEvents(10), formatted
 *    like `formatNotificationCount`) and the conflict dot. The shell already
 *    routes `calendar:open` to /calendar (MobileAppShell.tsx:50), so the bar
 *    does not listen for it a second time.
 *  - Life Compass (`:108-118`) emits `vitana:open-life-compass`, the web
 *    LifeCompassPopupContext event (events.ts).
 *  - Gift Voucher (`:121-123`) is hidden when the IAP-restricted check is
 *    true — the native rule is the drawer's `iapRestricted`
 *    (`Platform.OS === 'ios'`, SideDrawer.tsx:105 / drawer.ts:37), the twin of
 *    the web `isIAPRestricted()`. A tap emits `gift-voucher:open`; the
 *    MaxinaVoucherModal checkout (a purchase surface) is not ported here.
 * React 19: typed with `ReactElement`.
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { HealthButtonIcon, HealthIcon, Input, withAlpha } from '../../ports/health';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useHealthText } from './text';
import { useCalendarCounts } from './data/calendar';
import { openGiftVoucher, openLifeCompass } from './events';

/** CALENDAR_ROUTE (src/components/calendar/calendar-entry.ts:10). */
export const CALENDAR_ROUTE = '/calendar';

/** The native isIAPRestricted(): the drawer's rule (shell/logic/drawer.ts:37), read at render. */
export function isIAPRestricted(): boolean {
  return Platform.OS === 'ios';
}

/** formatNotificationCount (notification-badge.tsx:20-26). */
export function formatNotificationCount(count: number): string {
  if (count === 0) return '';
  if (count < 100) return String(count);
  if (count < 1000) return '99+';
  return '999+';
}

function Pill({ testID, onPress, accessibilityLabel, children }: { testID: string; onPress: () => void; accessibilityLabel?: string; children: ReactNode }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Button testID={testID} variant="ghost" size="sm" onPress={onPress} accessibilityLabel={accessibilityLabel} style={[styles.pill, { backgroundColor: withAlpha(colors.muted, 0.6) }]}>
      {children}
    </Button>
  );
}

export function ExpandableSearchButton({ placeholder }: { placeholder?: string }): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const collapse = () => {
    setExpanded(false);
    setQuery('');
  };
  if (expanded) {
    return (
      <View style={styles.searchWrap}>
        <View style={styles.searchIcon} pointerEvents="none">
          <HealthIcon name="Search" size={16} color={colors.mutedForeground} />
        </View>
        <Input
          testID="health-search-input"
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder || `${t('actionBar.search')}…`}
          accessibilityLabel={t('actionBar.search')}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Button testID="health-search-close" variant="ghost" size="sm" onPress={collapse} accessibilityLabel={t('healthNative.utility.closeSearch')} style={styles.searchClose}>
          <HealthButtonIcon name="X" size={12} />
        </Button>
      </View>
    );
  }
  return (
    <Pill testID="health-search-button" onPress={() => setExpanded(true)}>
      <HealthIcon name="Search" size={16} color={colors.mutedForeground} />
      <Text size="sm">{t('actionBar.search')}</Text>
    </Pill>
  );
}

export function UniversalCalendarButton(): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const { upcoming, conflicts } = useCalendarCounts();
  return (
    <View style={styles.wrap}>
      <Pill testID="health-calendar-button" onPress={() => navigateToWebPath(CALENDAR_ROUTE)} accessibilityLabel={t('actionBar.calendar')}>
        <HealthIcon name="Calendar" size={16} color={colors.foreground} />
        <Text size="sm">{t('actionBar.calendar')}</Text>
      </Pill>
      {upcoming > 0 ? (
        <View
          testID="health-calendar-badge"
          accessible
          accessibilityRole="text"
          accessibilityLabel={t(upcoming === 1 ? 'healthNative.utility.upcomingEvent' : 'healthNative.utility.upcomingEvents', { count: upcoming })}
          pointerEvents="none"
          style={[styles.badge, { backgroundColor: colors.statusInfo }]}
        >
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText}>
            {formatNotificationCount(upcoming)}
          </Text>
        </View>
      ) : null}
      {conflicts > 0 ? (
        <View testID="health-calendar-conflict" pointerEvents="none" style={[styles.conflict, { backgroundColor: colors.statusWarning, borderColor: colors.background }]} />
      ) : null}
    </View>
  );
}

export function HealthUtilityBar({
  modes,
  mode,
  onModeChange,
  onUpload,
  children,
}: {
  modes: ModeOption[];
  mode: string;
  onModeChange: (value: string) => void;
  onUpload: () => void;
  /** afterGiftVoucherChildren (the Vitana Index and Autopilot chips). */
  children?: ReactNode;
}): ReactElement {
  const { colors } = useUITheme();
  const { t } = useHealthText();
  const hideVoucher = isIAPRestricted();
  return (
    <View testID="health-utility-bar" style={styles.bar}>
      <ExpandableSearchButton placeholder={t('healthNative.searchPlaceholder')} />
      <MobileModePill modes={modes} activeMode={mode} onModeChange={onModeChange} title={t('healthNative.selectMode')} />
      <UniversalCalendarButton />
      <Button testID="health-upload-button" variant="ghost" size="sm" onPress={onUpload} style={[styles.pill, { backgroundColor: withAlpha(colors.statusSuccess, 0.6) }]}>
        <HealthButtonIcon name="Plus" />
        {t('healthNative.upload')}
      </Button>
      <Pill testID="health-life-compass-button" onPress={openLifeCompass}>
        <HealthIcon name="Target" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('lifeCompass.title')}</Text>
      </Pill>
      {!hideVoucher ? (
        <Pill testID="health-gift-voucher-button" onPress={openGiftVoucher}>
          <HealthIcon name="Gift" size={16} color={colors.mutedForeground} />
          <Text size="sm">{t('actionBar.giftVoucher')}</Text>
        </Pill>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { position: 'relative', flexShrink: 0 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  searchWrap: { width: 256, height: 36, justifyContent: 'center' },
  searchIcon: { position: 'absolute', start: 12, zIndex: 1 },
  searchInput: { height: 36, paddingStart: 40, paddingEnd: 40, borderRadius: 8 },
  searchClose: { position: 'absolute', end: 4, height: 28, width: 28, paddingHorizontal: 0 },
  badge: { position: 'absolute', top: -6, end: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  badgeText: { fontSize: 10, lineHeight: 12 },
  conflict: { position: 'absolute', top: -6, start: -6, height: 12, width: 12, borderRadius: 6, borderWidth: 2, zIndex: 10 },
});
