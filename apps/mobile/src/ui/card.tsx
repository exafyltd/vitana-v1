/** VTID-05176 — Card and its five parts (web card.tsx:5-79): rounded-lg border bg-card shadow-sm. */
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';
import { Text, type TextProps } from './foundation/Text';

export function Card({ style, ...rest }: ViewProps) {
  const { colors, radius, elevation } = useTheme();
  return (
    <View
      {...rest}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg, ...elevation.sm }, style]}
    />
  );
}

export function CardHeader({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.header, style]} />;
}

export function CardTitle({ style, children, ...rest }: TextProps & { children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text accessibilityRole="header" size="2xl" weight="600" color={colors.cardForeground} style={[styles.title, style]} {...rest}>
      {children}
    </Text>
  );
}

export function CardDescription({ style, ...rest }: TextProps) {
  return <Text size="sm" muted style={style} {...rest} />;
}

export function CardContent({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.content, style]} />;
}

export function CardFooter({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.footer, style]} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: { padding: 24, gap: 6 },
  title: { lineHeight: 28, letterSpacing: -0.5 },
  content: { padding: 24, paddingTop: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 0 },
});
