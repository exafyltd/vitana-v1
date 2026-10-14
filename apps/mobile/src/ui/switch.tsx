/**
 * VTID-05176 — Switch (web switch.tsx): track 44×24, thumb 20, role `switch`.
 * The thumb travels toward the INLINE END (flex-start → flex-end in a row), so
 * RTL is correct by construction (the web needed VTID-04406's fix).
 */
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useTheme } from './provider/context';
import { hitSlopFor } from './foundation/hitSlop';
import { useControllableState } from './overlay/useControllableState';

export type SwitchProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Switch = forwardRef<View, SwitchProps>(function Switch(
  { checked, defaultChecked = false, onCheckedChange, disabled, style, ...rest },
  ref,
) {
  const theme = useTheme();
  const [on, setOn] = useControllableState(checked, defaultChecked, onCheckedChange);
  return (
    <Pressable
      ref={ref}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlopFor(44, 24)}
      {...rest}
      onPress={() => setOn(!on)}
      style={[
        styles.track,
        { backgroundColor: on ? theme.colors.primary : theme.colors.input, borderRadius: theme.radius.full, opacity: disabled ? 0.5 : 1 },
        on ? styles.on : styles.off,
        style,
      ]}
    >
      <Animated.View
        testID="switch-thumb"
        layout={theme.reducedMotion ? undefined : LinearTransition.duration(theme.motion.crossFadeMs)}
        style={[styles.thumb, { backgroundColor: theme.colors.background, borderRadius: theme.radius.full, ...theme.elevation.lg }]}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  track: { width: 44, height: 24, borderWidth: 0, padding: 2, flexDirection: 'row', alignItems: 'center' },
  on: { justifyContent: 'flex-end' },
  off: { justifyContent: 'flex-start' },
  thumb: { width: 20, height: 20 },
});
