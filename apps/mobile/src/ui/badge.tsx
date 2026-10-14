/** VTID-05176 — Badge (web badge.tsx): default | secondary | destructive | success | outline. */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './provider/context';
import { Text } from './foundation/Text';
import { legacyColors } from './theme';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
export const BADGE_VARIANTS: readonly BadgeVariant[] = ['default', 'secondary', 'destructive', 'success', 'outline'];

export type BadgeProps = ViewProps & { variant?: BadgeVariant; style?: StyleProp<ViewStyle>; children?: ReactNode };

export function Badge({ variant = 'default', style, children, ...rest }: BadgeProps) {
  const { colors: c, radius } = useTheme();
  const map: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
    default: { bg: c.primary, fg: c.primaryForeground, border: legacyColors.transparent },
    secondary: { bg: c.secondary, fg: c.secondaryForeground, border: legacyColors.transparent },
    destructive: { bg: c.destructive, fg: c.destructiveForeground, border: legacyColors.transparent },
    success: { bg: legacyColors.badgeSuccessBg, fg: legacyColors.badgeSuccessText, border: legacyColors.transparent },
    outline: { bg: legacyColors.transparent, fg: c.foreground, border: c.border },
  };
  const v = map[variant];
  return (
    <View {...rest} style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border, borderRadius: radius.full }, style]}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text size="xs" weight="600" color={v.fg}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
});
