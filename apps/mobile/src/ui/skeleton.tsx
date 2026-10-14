/** VTID-05176 — Skeleton (web skeleton.tsx): `animate-pulse rounded-md bg-muted`; static under reduced motion (SR-22). */
import { useEffect } from 'react';
import { type ViewProps } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from './provider/context';

export function Skeleton({ style, accessibilityLabel, ...rest }: ViewProps) {
  const theme = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (theme.reducedMotion) {
      opacity.value = 1;
      return undefined;
    }
    // Tailwind animate-pulse: 2 s, opacity 1 → 0.5 → 1.
    opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1);
    return () => cancelAnimation(opacity);
  }, [theme.reducedMotion, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityState={accessibilityLabel ? { busy: true } : undefined}
      {...rest}
      style={[{ backgroundColor: theme.colors.muted, borderRadius: theme.radius.md }, style, animated]}
    />
  );
}
