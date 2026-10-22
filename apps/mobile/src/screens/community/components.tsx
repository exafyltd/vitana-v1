/**
 * VTID-05296 (N-W2 community-hub) — shared presentational building blocks for
 * the ported community / intents / search screens. Built only on the ports
 * layer and `@vitana/ui`; design tokens via the kit theme; RTL-safe (logical
 * `start`/`end`, no physical left/right). Every user-visible string arrives
 * already translated from the screen via `t()`.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, Spinner, PressableRow, useUITheme } from '../../ports/ui';

/** Page scaffold: a scrollable column with an optional header (title + subtitle). */
export function ScreenScaffold({
  title,
  subtitle,
  action,
  children,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <ScrollView
      testID={testID}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scaffold}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <View style={styles.fill}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text muted style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}

export type Chip = { key: string; label: string };

/** A horizontal, wrapping group of single-select filter chips. */
export function FilterChips({
  groupLabel,
  chips,
  selected,
  onSelect,
  testID,
}: {
  groupLabel: string;
  chips: readonly Chip[];
  selected: string;
  onSelect: (key: string) => void;
  testID?: string;
}) {
  return (
    <View
      style={styles.chipRow}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
      testID={testID}
    >
      {chips.map((c) => {
        const active = c.key === selected;
        return (
          <Button
            key={c.key}
            size="xs"
            variant={active ? 'default' : 'outline'}
            onPress={() => onSelect(c.key)}
            accessibilityState={{ selected: active }}
            testID={`${testID ?? 'chip'}-${c.key}`}
          >
            {c.label}
          </Button>
        );
      })}
    </View>
  );
}

/** Centered loading spinner with an accessible label. */
export function ListLoading({ label }: { label: string }) {
  return (
    <View style={styles.center} testID="list-loading">
      <Spinner accessibilityLabel={label} />
    </View>
  );
}

/** Centered empty state. */
export function ListEmpty({ title, description, testID }: { title: string; description?: string; testID?: string }) {
  return (
    <View style={styles.center} testID={testID ?? 'list-empty'}>
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        {title}
      </Text>
      {description ? <Text muted style={styles.emptyBody}>{description}</Text> : null}
    </View>
  );
}

/** Centered error state with a retry button. */
export function ListError({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <View style={styles.center} testID="list-error">
      <Text muted style={styles.emptyBody}>
        {message}
      </Text>
      <Button variant="outline" size="sm" onPress={onRetry} testID="list-retry">
        {retryLabel}
      </Button>
    </View>
  );
}

/** "Load more" pager button, shown only when there is another page. */
export function LoadMore({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <View style={styles.loadMore}>
      <Button variant="outline" size="sm" disabled={loading} onPress={onPress} testID="load-more">
        {label}
      </Button>
    </View>
  );
}

/** A tappable card row used by member / ask / match lists. */
export function CardRow({
  onPress,
  accessibilityLabel,
  children,
  testID,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  testID?: string;
}) {
  const { colors } = useUITheme();
  return (
    <PressableRow
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {children}
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  scaffold: { padding: 16, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fill: { flex: 1 },
  subtitle: { marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  loadMore: { alignItems: 'center', paddingTop: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'flex-start' },
});
