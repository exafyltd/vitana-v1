/**
 * VTID-05461 — the My Journey utility bar (AutopilotDashboard.tsx:452-475,
 * mobile `UtilityActionButton compact`): the expandable search over the
 * journey's recommendations (title / summary, up to 8 matches; tapping one
 * clears the search and opens the Autopilot popup) and the `AutopilotChip`
 * (twin of `src/components/mobile/MobileActionChips.tsx:60-82`: plane, label,
 * pending-count badge; opens the popup).
 *
 * Deferred with the same evidence as the home / diary lanes: the bar's
 * VitanaIndexChip (MobileActionChips.tsx:18-48, needs `useVitanaStreaks` and
 * opens the Index sheet), the UniversalCalendarButton (calendar lane) and the
 * UtilityActionButton's own gift-voucher entry are other lanes' surfaces with
 * no native twin yet; they are not drawn here.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput, useUITheme } from '../../ports/ui';
import { alpha, JourneyIcon } from '../../ports/journey';
import { useI18n } from '../../i18n/I18nProvider';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
}

export function AutopilotChip({ pendingCount, onPress }: { pendingCount: number; onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Pressable testID="journey-autopilot-chip" accessibilityRole="button" onPress={onPress} style={[styles.chip, { backgroundColor: alpha(colors.muted, 0.6) }]}>
      <JourneyIcon name="Plane" size={16} color={colors.mutedForeground} />
      <Text size="sm">{t('actionBar.autopilot')}</Text>
      {pendingCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]} testID="journey-autopilot-chip-count">
          <Text size="xs" color={colors.destructiveForeground}>
            {String(pendingCount)}
          </Text>
        </View>
      ) : null}
    </Pressable>
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
  const showDropdown = expanded && query.trim().length > 0 && results.length > 0;
  return (
    <View testID="journey-utility-bar" style={styles.wrap}>
      <View style={styles.row}>
        {expanded ? (
          <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <JourneyIcon name="Search" size={16} color={colors.mutedForeground} />
            <TextInput
              testID="journey-search-input"
              value={query}
              onChangeText={onQueryChange}
              placeholder={t('screens.autopilotdashboard.searchTasks')}
              autoFocus
              style={styles.flex}
            />
            <Pressable
              testID="journey-search-close"
              accessibilityRole="button"
              accessibilityLabel={t('screens.common.close')}
              hitSlop={8}
              onPress={() => {
                onQueryChange('');
                setExpanded(false);
              }}
            >
              <JourneyIcon name="X" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID="journey-search-open"
            accessibilityRole="button"
            accessibilityLabel={t('screens.autopilotdashboard.searchTasks')}
            onPress={() => setExpanded(true)}
            style={[styles.iconBtn, { backgroundColor: alpha(colors.muted, 0.6) }]}
          >
            <JourneyIcon name="Search" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
        <AutopilotChip pendingCount={pendingCount} onPress={onOpenAutopilot} />
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, height: 36 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 999 },
  badge: { position: 'absolute', top: -4, end: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  dropdown: { borderWidth: 1, borderRadius: 12, paddingVertical: 4 },
  result: { paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
});
