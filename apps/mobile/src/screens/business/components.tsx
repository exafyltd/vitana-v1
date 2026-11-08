/**
 * VTID-05645 (native-wave2-sharing-business-r3/business-hub) — presentational blocks shared by the
 * Business Hub tabs and the opportunities / listings pages: the empty state the web draws as a big
 * glyph + title + body, the error state with retry, and the loading rows. Built on the ports layer;
 * colours come from the kit theme, spacing is logical, every string arrives already translated.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';

export function EmptyState({
  glyph,
  title,
  body,
  action,
  testID,
}: {
  glyph: string;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; testID?: string };
  testID: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <Text style={styles.glyph} accessibilityElementsHidden importantForAccessibility="no">
        {glyph}
      </Text>
      <Text variant="title" style={styles.centered}>
        {title}
      </Text>
      {body ? (
        <Text muted style={styles.centered}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <Button variant={action.testID ? 'default' : 'outline'} onPress={action.onPress} testID={action.testID}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, retryLabel, onRetry, testID }: { message: string; retryLabel: string; onRetry: () => void; testID: string }) {
  return (
    <View style={styles.empty} testID={testID} accessibilityRole="alert">
      <Text style={styles.centered}>{message}</Text>
      <Button variant="outline" size="sm" onPress={onRetry}>
        {retryLabel}
      </Button>
    </View>
  );
}

export function LoadingRows({ count = 3, testID }: { count?: number; testID: string }) {
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i += 1) items.push(<Skeleton key={i} style={styles.skeleton} />);
  return (
    <View style={styles.list} testID={testID} accessibilityState={{ busy: true }}>
      {items}
    </View>
  );
}

/** A bordered card surface (the web `Card` / rounded-xl border). */
export function Surface({ children, testID, onPress, accessibilityLabel }: { children: ReactNode; testID?: string; onPress?: () => void; accessibilityLabel?: string }) {
  const { colors } = useUITheme();
  const style = [styles.surface, { backgroundColor: colors.card, borderColor: colors.border }];
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} testID={testID} style={style}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
}

export function FilterChips<K extends string>({
  groupLabel,
  chips,
  selected,
  onSelect,
  testIDPrefix,
}: {
  groupLabel: string;
  chips: ReadonlyArray<{ key: K; label: string }>;
  selected: K;
  onSelect: (key: K) => void;
  testIDPrefix: string;
}) {
  const { colors } = useUITheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={groupLabel} style={styles.chipRow}>
      {chips.map((chip) => {
        const active = chip.key === selected;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            onPress={() => onSelect(chip.key)}
            testID={`${testIDPrefix}-${chip.key}`}
            style={[styles.chip, { borderColor: colors.border, backgroundColor: active ? colors.primary : colors.card }]}
          >
            <Text size="sm" weight="600" style={{ color: active ? colors.primaryForeground : colors.foreground }}>
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 16 },
  glyph: { fontSize: 40 },
  centered: { textAlign: 'center' },
  list: { gap: 12 },
  skeleton: { height: 96, borderRadius: 16 },
  surface: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, alignSelf: 'stretch' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
