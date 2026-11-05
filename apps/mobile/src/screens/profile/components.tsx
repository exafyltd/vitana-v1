/**
 * VTID-05429 (Native Wave 2, profile lane) — presentational building blocks
 * shared by the my-profile and privacy screens: the segmented control (web
 * `ProfileIdSegmentedControl`), the underline tab bar (web
 * `MobileProfileTabs`), a section card, the tier badge (web PrivacySettings
 * `VisibilityRow` / Account card visibility pill) and the stats strip (web
 * `MobileProfileStats`). Built only on the ports layer; every visual value
 * from the kit theme (tokens); RTL-safe (logical start/end only). Every
 * user-visible string arrives already translated. React 19: `ReactElement`.
 */
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, PressableRow, Text, useUITheme } from '../../ports/ui';
import type { FieldVisibility } from '../../ports/profile';

export function Segmented<K extends string>({
  segments,
  value,
  onChange,
  testID,
}: {
  segments: readonly { id: K; label: string }[];
  value: K;
  onChange: (next: K) => void;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} accessibilityRole="tablist" style={[styles.segmented, { backgroundColor: colors.muted }]}>
      {segments.map((s) => {
        const active = s.id === value;
        return (
          <PressableRow
            key={s.id}
            onPress={() => onChange(s.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.label}
            testID={`${testID}-${s.id}`}
            style={[styles.segment, active ? { backgroundColor: colors.card } : null]}
          >
            <Text variant="label" color={active ? colors.foreground : colors.mutedForeground} numberOfLines={1}>
              {s.label}
            </Text>
          </PressableRow>
        );
      })}
    </View>
  );
}

export function UnderlineTabs<K extends string>({
  tabs,
  value,
  onChange,
  testID,
}: {
  tabs: readonly { id: K; label: string }[];
  value: K;
  onChange: (next: K) => void;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.border }]}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <PressableRow
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            testID={`${testID}-${tab.id}`}
            style={[styles.tab, active ? { borderBottomColor: colors.primary } : { borderBottomColor: 'transparent' }]}
          >
            <Text weight="600" color={active ? colors.primary : colors.mutedForeground}>
              {tab.label}
            </Text>
          </PressableRow>
        );
      })}
    </View>
  );
}

/** A bordered card with an optional header row (title, subtitle, trailing action). */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  testID,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {title || action ? (
        <View style={styles.cardHeader}>
          <View style={styles.fill}>
            {title ? <Text weight="600">{title}</Text> : null}
            {subtitle ? (
              <Text variant="caption" muted>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const TIER_ICON: Record<FieldVisibility, string> = { private: 'Shield', connections: 'Users', public: 'Compass' };

/** The Private / Connections / Public pill; tap cycles (web `VisibilityRow` button). */
export function TierBadge({
  tier,
  label,
  accessibilityLabel,
  onPress,
  disabled,
  testID,
}: {
  tier: FieldVisibility;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}): ReactElement {
  const { colors } = useUITheme();
  const tone =
    tier === 'private'
      ? { bg: colors.destructive, fg: colors.destructiveForeground }
      : tier === 'connections'
        ? { bg: colors.accent, fg: colors.accentForeground }
        : { bg: colors.primary, fg: colors.primaryForeground };
  return (
    <PressableRow
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={[styles.badge, disabled ? { backgroundColor: colors.muted, opacity: 0.6 } : { backgroundColor: tone.bg }]}
    >
      <Icon name={TIER_ICON[tier]} size={14} color={disabled ? colors.mutedForeground : tone.fg} />
      <Text variant="label" color={disabled ? colors.mutedForeground : tone.fg}>
        {label}
      </Text>
    </PressableRow>
  );
}

/** Web `MobileProfileStats.formatCount`: `1.2k` from 1000 on. */
export function formatCount(count: number): string {
  if (!Number.isFinite(count)) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function StatsStrip({ stats, testID }: { stats: readonly { key: string; value: number; label: string }[]; testID?: string }): ReactElement {
  return (
    <View testID={testID} style={styles.stats}>
      {stats.map((s) => (
        <View key={s.key} style={styles.stat} testID={`${testID}-${s.key}`}>
          <Text weight="600">{formatCount(s.value)}</Text>
          <Text variant="caption" muted>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  stats: { flexDirection: 'row', paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
