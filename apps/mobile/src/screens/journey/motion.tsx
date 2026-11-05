/**
 * VTID-05461 — the web journey components' motion, with react-native
 * `Animated` (JS driver; react-native-svg props cannot use the native driver):
 *  - `RingProgressCircle`: framer-motion's ring fill, `strokeDashoffset` eased
 *    from the full circumference to the offset (DreamNorthStar.tsx:516-527,
 *    1.4 s; GoalProgressRing.tsx:140-151, 1.1 s; `easeOut`);
 *  - `useLoop`: a 0 → 1 → 0 ease-in-out loop — the guided start button's
 *    pulsing glow (DreamNorthStar.tsx:592-603, 2.2 s) and Tailwind's
 *    `animate-pulse` (opacity 1 → .5 → 1, 2 s) on the Autopilot badge, the
 *    calendar conflict dot and the loading bars.
 * Reduced motion (the OS setting via the kit) draws the end state, as the web
 * does with `useReducedMotion()` / `prefers-reduced-motion`.
 */
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { Circle, type CircleProps } from 'react-native-svg';
import { useReducedMotion } from '../../ports/journey';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function RingProgressCircle({ circumference, offset, durationMs, ...rest }: Omit<CircleProps, 'strokeDashoffset' | 'strokeDasharray'> & { circumference: number; offset: number; durationMs: number }): ReactElement {
  const reduce = useReducedMotion();
  const value = useRef(new Animated.Value(circumference)).current;
  useEffect(() => {
    if (reduce) return undefined;
    const anim = Animated.timing(value, { toValue: offset, duration: durationMs, easing: Easing.out(Easing.ease), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [reduce, offset, durationMs, value]);
  if (reduce) return <Circle {...rest} strokeDasharray={`${circumference}`} strokeDashoffset={offset} />;
  return <AnimatedCircle {...rest} strokeDasharray={`${circumference}`} strokeDashoffset={value} />;
}

/** A 0 → 1 → 0 loop while `enabled` and motion is allowed; null otherwise. */
export function useLoop(enabled: boolean, durationMs: number): Animated.Value | null {
  const reduce = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const on = enabled && !reduce;
  useEffect(() => {
    if (!on) return undefined;
    const half = durationMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, durationMs, value]);
  return on ? value : null;
}

/** Tailwind `animate-pulse` (opacity 1 → .5 → 1 over 2 s) around `children`. */
export function Pulse({ enabled = true, style, children, testID }: { enabled?: boolean; style?: StyleProp<ViewStyle>; children: ReactNode; testID?: string }): ReactElement {
  const loop = useLoop(enabled, 2000);
  const opacity = loop ? loop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) : 1;
  return (
    <Animated.View style={[style, { opacity }]} testID={testID}>
      {children}
    </Animated.View>
  );
}
