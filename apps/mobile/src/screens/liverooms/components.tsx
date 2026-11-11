/**
 * VTID-05532 (native-wave2-events-calendar-r3/live-rooms) — presentational blocks shared by the
 * live-rooms list and viewer: the tab chips, the empty and error states, and the loading rows.
 * Built on the ports layer and `@vitana/ui`; colours come from the kit theme, spacing is logical
 * (start / end), and every string arrives already translated from the screen.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';

export type RoomsTab = 'all' | 'live' | 'scheduled' | 'past';

export function ModeChips({
  groupLabel,
  chips,
  selected,
  onSelect,
  testID,
}: {
  groupLabel: string;
  chips: ReadonlyArray<{ key: RoomsTab; label: string; count?: number }>;
  selected: RoomsTab;
  onSelect: (key: RoomsTab) => void;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={groupLabel} style={styles.chipRow} testID={testID}>
      {chips.map((chip) => {
        const active = chip.key === selected;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            onPress={() => onSelect(chip.key)}
            testID={`live-rooms-tab-${chip.key}`}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.card },
            ]}
          >
            <Text size="sm" weight="600" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
              {chip.count ? `${chip.label} ${chip.count}` : chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyBlock({
  body,
  hint,
  action,
  testID,
}: {
  body: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
  testID: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <Text muted>{body}</Text>
      {hint ? (
        <Text variant="caption" muted style={styles.hint}>
          {hint}
        </Text>
      ) : null}
      {action ? (
        <Button variant="outline" size="sm" onPress={action.onPress} style={styles.emptyAction}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

export function ListError({ message, retryLabel, onRetry, testID }: { message: string; retryLabel: string; onRetry: () => void; testID: string }) {
  return (
    <View style={styles.empty} testID={testID} accessibilityRole="alert">
      <Text>{message}</Text>
      <Button variant="outline" size="sm" onPress={onRetry} style={styles.emptyAction}>
        {retryLabel}
      </Button>
    </View>
  );
}

export function CardSkeletons({ count, testID }: { count: number; testID: string }) {
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i += 1) items.push(<Skeleton key={i} style={styles.skeleton} />);
  return (
    <View style={styles.list} testID={testID}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  empty: { alignItems: 'flex-start', gap: 8, paddingVertical: 24 },
  hint: { marginTop: 2 },
  emptyAction: { marginTop: 8 },
  skeleton: { height: 220, borderRadius: 20 },
});
