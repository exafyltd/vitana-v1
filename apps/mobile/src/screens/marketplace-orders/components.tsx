/**
 * VTID-05511 — shared building blocks of the marketplace-orders screens, each
 * a twin of the web piece it replaces (ports layer + `@vitana/ui` only, every
 * colour from the theme / tokens, logical start/end only):
 *  - `MobileHeader` — `StandardHeader`'s phone branch (StandardHeader.tsx:41-48):
 *    the title alone, `text-lg font-bold`;
 *  - `PulseSkeletons` — the `h-[88/100px] rounded-xl bg-muted/20 animate-pulse`
 *    loading rows and `SpotlightLoading` (a pulsing opacity loop);
 *  - `Panel` — the `Panel` / `Card` surface (`bg-card/80 border-border/20 rounded-xl`);
 *  - `Chip` — the small rounded pill (`px-2 py-0.5 rounded-md bg-muted text-xs`);
 *  - `ScreenScroll` — the page column with pull-to-refresh off (web scrolls the page).
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha } from '../../ports/marketplace-orders';

export function MobileHeader({ title }: { title: string }): ReactElement {
  return (
    <View style={styles.header}>
      <Text size="lg" weight="700" accessibilityRole="header" testID="mo-header-title">
        {title}
      </Text>
    </View>
  );
}

/** `animate-pulse`: opacity 1 → 0.5 → 1, 2 s, forever. */
export function Pulse({ children, style, testID }: { children?: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={[style, { opacity: v }]} testID={testID}>
      {children}
    </Animated.View>
  );
}

export function PulseSkeletons({ rows = 3, height = 88, testID = 'mo-skeleton' }: { rows?: number; height?: number; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.stack} testID={testID} accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <Pulse key={i} style={[styles.skeleton, { height, backgroundColor: alpha(colors.muted, 0.2) }]} />
      ))}
    </View>
  );
}

export function Panel({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.panel, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }, style]}>
      {children}
    </View>
  );
}

export function Chip({ label, tint, color, testID }: { label: string; tint?: string; color?: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View testID={testID} style={[styles.chip, { backgroundColor: tint ?? colors.muted }]}>
      <Text size="xs" color={color ?? colors.mutedForeground}>
        {label}
      </Text>
    </View>
  );
}

export function ScreenScroll({ children, testID, stickyHeaderIndices }: { children: ReactNode; testID?: string; stickyHeaderIndices?: number[] }): ReactElement {
  const { colors } = useUITheme();
  return (
    <ScrollView
      testID={testID}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={stickyHeaderIndices}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 4 },
  stack: { gap: 12 },
  skeleton: { borderRadius: 12 },
  panel: { borderWidth: 1, borderRadius: 12 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  scroll: { paddingBottom: 96 },
});
