/**
 * VTID-05461 (native-wave2-journey-autopilot-r2/journey) — shared building
 * blocks of the My Journey screen: the web `Card` / `Panel` (rounded-2xl,
 * 1px border, an optional tinted border), the `HeartDivider` of the dream-board
 * hero, the uppercase section eyebrow and the small rounded count pill. Tokens
 * only (kit theme + `--category-*` through the journey port); logical
 * start/end only (RTL-safe).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha } from '../../ports/journey';

/** The web `Card` / `Panel`: card surface, border (optionally tinted), radius 16 (`rounded-2xl`). */
export function JourneyCard({
  children,
  tint,
  radius = 16,
  padding = 16,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: {
  children: ReactNode;
  /** A token colour the border takes at 15% (web `border-<tone>/15`). */
  tint?: string;
  radius?: number;
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useUITheme();
  const box: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: colors.card, borderColor: tint ? alpha(tint, 0.15) : colors.border, borderRadius: radius, padding },
    style,
  ];
  if (onPress) {
    return (
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={box}>
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={box}>
      {children}
    </View>
  );
}

/** Two short rules with a small heart between them (DreamNorthStar.tsx HeartDivider). */
export function HeartDivider({ width = 32, line, heart }: { width?: number; line: string; heart: string }) {
  return (
    <View style={styles.heartRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width, height: 1, backgroundColor: alpha(line, 0.32) }} />
      <Text size="xs" color={heart}>
        ♡
      </Text>
      <View style={{ width, height: 1, backgroundColor: alpha(line, 0.32) }} />
    </View>
  );
}

/** `text-xs uppercase tracking-wide text-muted-foreground`. */
export function Eyebrow({ children, testID }: { children: string; testID?: string }) {
  return (
    <Text testID={testID} size="xs" muted style={styles.eyebrow}>
      {children.toUpperCase()}
    </Text>
  );
}

/** A small rounded pill (`text-[11px] font-bold px-2 py-0.5 rounded-full`). */
export function Pill({ children, color, background, testID }: { children: ReactNode; color: string; background: string; testID?: string }) {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: background }]}>
      <Text size="xs" weight="700" color={color}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  heartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  eyebrow: { letterSpacing: 0.6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, alignSelf: 'flex-start' },
});
