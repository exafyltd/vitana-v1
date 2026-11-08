/**
 * VTID-05653 — the buttons of the shared utility bar, twins of the web pieces
 * the pages put in `UtilityActionButton`:
 *
 *  - `SearchButton` (expandable-search-button.tsx): the "Search" pill; tapped
 *    it becomes the 256-pt field (auto-focus) with the × that collapses it.
 *    `onSearch` receives the text on every change (Home filters its articles
 *    with it); without it the text filters nothing, as on the Daily Diary;
 *  - `CalendarButton` (UniversalCalendarButton.tsx): pill → `/calendar`, the
 *    upcoming-count badge (first 10, NotificationBadge's 99+ rule) and the
 *    pulsing conflict dot (its `calendar:open` listener is the shell's);
 *  - `VitanaIndexChip` (MobileActionChips.tsx): 🧬 + today's Vitana Index
 *    ("…" while loading); emits `vitana:open-index`, and with no screen
 *    listening opens /health like the Discover rail's pill;
 *  - `AutopilotChip`: plane + "Autopilot" and the pulsing pending-count badge,
 *    opening the Autopilot popup through `autopilot:open`;
 *  - `RailPill`: the round-cornered pill the others share. Every button has an
 *    accessibility label and a 44-pt hit target (36 pt + 4 pt hit slop).
 */
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput, useUITheme } from '../../ports/ui';
import { alpha, UtilityIcon } from '../../ports/utility';
import { navigateToWebPath } from '../../navigation/navigate';
import { overlayBus } from '../../navigation/overlay-bus';
import { useI18n } from '../../i18n/I18nProvider';
import { useAutopilotPendingCount, useCalendarEvents, useVitanaIndex } from './data';
import { AUTOPILOT_OPEN, INDEX_OPEN } from './events';

const CALENDAR_ROUTE = '/calendar';
const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 } as const;

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

export function RailPill({ testID, label, onPress, children, tight = false }: { testID: string; label: string; onPress: () => void; children: ReactNode; tight?: boolean }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[styles.pill, tight ? styles.pillTight : null, { backgroundColor: alpha(colors.muted, 0.6) }]}
    >
      {children}
    </Pressable>
  );
}

export function SearchButton({ placeholder, onSearch, testID = 'utility-search' }: { placeholder?: string; onSearch?: (query: string) => void; testID?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const change = (text: string) => {
    setQuery(text);
    onSearch?.(text);
  };
  if (expanded) {
    return (
      <View style={[styles.search, { borderColor: colors.input, backgroundColor: colors.background }]} testID={`${testID}-field`}>
        <UtilityIcon name="Search" size={16} color={colors.mutedForeground} />
        <TextInput testID={`${testID}-input`} value={query} onChangeText={change} placeholder={placeholder || `${t('actionBar.search')}…`} autoFocus style={styles.flex} />
        <Pressable
          testID={`${testID}-close`}
          accessibilityRole="button"
          accessibilityLabel={t('screens.common.close')}
          hitSlop={16}
          onPress={() => {
            change('');
            setExpanded(false);
          }}
        >
          <UtilityIcon name="X" size={12} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  }
  return (
    <RailPill testID={`${testID}-open`} label={t('actionBar.search')} onPress={() => setExpanded(true)} tight>
      <UtilityIcon name="Search" size={16} color={colors.mutedForeground} />
      <Text size="sm">{t('actionBar.search')}</Text>
    </RailPill>
  );
}

export function CalendarButton(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { upcoming, conflictCount } = useCalendarEvents();
  const label = t('actionBar.calendar');
  return (
    <View style={styles.badgeHost}>
      <RailPill testID="utility-calendar-button" label={label} onPress={() => navigateToWebPath(CALENDAR_ROUTE)} tight>
        <UtilityIcon name="Calendar" size={16} color={colors.foreground} />
        <Text size="sm">{label}</Text>
      </RailPill>
      {upcoming.length > 0 ? (
        <View
          style={[styles.countBadge, { backgroundColor: colors.statusInfo }]}
          accessibilityRole="text"
          accessibilityLabel={t('discoverCommerceNative.calendar.upcomingCount', { count: upcoming.length })}
          pointerEvents="none"
          testID="utility-calendar-count"
        >
          <Text weight="700" color={colors.primaryForeground} style={styles.badgeText}>
            {formatNotificationCount(upcoming.length)}
          </Text>
        </View>
      ) : null}
      {conflictCount > 0 ? <Pulse style={[styles.conflictDot, { backgroundColor: colors.statusWarning, borderColor: colors.background }]} testID="utility-calendar-conflict" /> : null}
    </View>
  );
}

export function VitanaIndexChip(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { index, isLoading } = useVitanaIndex();
  const value = isLoading || !index ? '…' : String(index.total);
  const open = () => {
    if (overlayBus.listenerCount(INDEX_OPEN) > 0) overlayBus.emit(INDEX_OPEN);
    else navigateToWebPath('/health');
  };
  return (
    <RailPill testID="utility-index-chip" label={t('discoverCommerceNative.indexPill', { value })} onPress={open}>
      <Text size="xs" style={styles.dim} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        🧬
      </Text>
      <Text size="sm" weight="500" color={colors.primary}>
        {value}
      </Text>
    </RailPill>
  );
}

export function AutopilotChip(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const pendingCount = useAutopilotPendingCount();
  return (
    <View style={styles.badgeHost}>
      <RailPill testID="utility-autopilot-chip" label={t('actionBar.autopilot')} onPress={() => overlayBus.emit(AUTOPILOT_OPEN)}>
        <UtilityIcon name="Plane" size={16} color={colors.mutedForeground} />
        <Text size="sm">{t('actionBar.autopilot')}</Text>
      </RailPill>
      {pendingCount > 0 ? (
        <Pulse style={[styles.badge, { backgroundColor: colors.destructive }]} testID="utility-autopilot-count">
          <Text weight="600" color={colors.destructiveForeground} style={styles.badgeText}>
            {String(pendingCount)}
          </Text>
        </Pulse>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  pillTight: { paddingHorizontal: 10, gap: 4 },
  search: { width: 256, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 36 },
  badgeHost: { position: 'relative' },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  countBadge: { position: 'absolute', top: -6, end: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  conflictDot: { position: 'absolute', top: -6, start: -6, width: 12, height: 12, borderRadius: 6, borderWidth: 2, zIndex: 10 },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
