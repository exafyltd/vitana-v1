/**
 * VTID-05176 — Checkbox (web checkbox.tsx): 16×16, `checked: boolean |
 * 'indeterminate'` (→ accessibility `mixed`), `onCheckedChange`, 44 pt hit area.
 */
import { forwardRef } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Check, Minus } from 'lucide-react-native';
import { useTheme } from './provider/context';
import { hitSlopFor } from './foundation/hitSlop';
import { useControllableState } from './overlay/useControllableState';
import { legacyColors } from './theme';

export type CheckedState = boolean | 'indeterminate';

export type CheckboxProps = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Checkbox = forwardRef<View, CheckboxProps>(function Checkbox(
  { checked, defaultChecked = false, onCheckedChange, disabled, style, ...rest },
  ref,
) {
  const theme = useTheme();
  const [state, setState] = useControllableState<CheckedState>(checked, defaultChecked, onCheckedChange);
  const filled = state === true || state === 'indeterminate';
  return (
    <Pressable
      ref={ref}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state === 'indeterminate' ? 'mixed' : state, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlopFor(16, 16)}
      {...rest}
      onPress={() => setState(state === 'indeterminate' ? true : !state)}
      style={[
        {
          width: 16,
          height: 16,
          borderWidth: 1,
          borderRadius: theme.radius.sm,
          borderColor: theme.colors.primary,
          backgroundColor: filled ? theme.colors.primary : legacyColors.transparent,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {state === true ? <Check size={14} color={theme.colors.primaryForeground} /> : null}
      {state === 'indeterminate' ? <Minus size={14} color={theme.colors.primaryForeground} /> : null}
    </Pressable>
  );
});
