/**
 * VTID-05512 — the small pieces the commerce screens share:
 *  - `Panel` / `PanelBody`: the web `Panel` / `PanelContent` (a Card);
 *  - `Notice`: the web `Alert` + `AlertTriangle` + `AlertDescription`
 *    (default or destructive), `role="alert"`;
 *  - `PulseBlock`: the `animate-pulse bg-muted` loading blocks;
 *  - `goBack`: `navigate(-1)`; a cold start has no history, so the screen's
 *    natural parent opens instead.
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Card, Text, useUITheme } from '../../ports/ui';
import { alpha, CheckoutIcon } from '../../ports/commerce';
import { navigateToWebPath } from '../../navigation/navigate';

export function goBack(fallback: string): void {
  if (router.canGoBack()) router.back();
  else navigateToWebPath(fallback);
}

export function Panel({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }): ReactElement {
  return (
    <Card style={style} testID={testID}>
      {children}
    </Card>
  );
}

export function PanelBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }): ReactElement {
  return <View style={[styles.body, style]}>{children}</View>;
}

export function Notice({ children, destructive = false, title, testID }: { children: ReactNode; destructive?: boolean; title?: string; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  const tint = destructive ? colors.destructive : colors.foreground;
  return (
    <View
      accessibilityRole="alert"
      testID={testID}
      style={[styles.notice, { borderColor: destructive ? alpha(colors.destructive, 0.5) : colors.border, backgroundColor: colors.background }]}
    >
      <CheckoutIcon name="AlertTriangle" size={16} color={tint} />
      <View style={styles.flex}>
        {title ? (
          <Text size="sm" weight="500" color={tint}>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text size="sm" color={tint}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function PulseBlock({ height, width = '100%', radius = 6, style }: { height: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }): ReactElement {
  const { colors } = useUITheme();
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
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.muted, opacity }, style]} />;
}

const styles = StyleSheet.create({
  body: { padding: 24, gap: 12 },
  flex: { flex: 1, gap: 2 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: 8, padding: 16 },
});
