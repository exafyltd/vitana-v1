/** VTID-05176 — RadioGroup (web radio-group.tsx): role `radiogroup` with `radio` items, 44 pt hit area. */
import { createContext, useContext, useMemo } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { Circle } from 'lucide-react-native';
import { useTheme } from './provider/context';
import { hitSlopFor } from './foundation/hitSlop';
import { useControllableState } from './overlay/useControllableState';

type Ctx = { value: string; setValue: (v: string) => void; disabled: boolean };
const RadioContext = createContext<Ctx | null>(null);

export type RadioGroupProps = ViewProps & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
};

export function RadioGroup({ value, defaultValue = '', onValueChange, disabled = false, orientation = 'vertical', style, ...rest }: RadioGroupProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange);
  const ctx = useMemo(() => ({ value: current, setValue: setCurrent, disabled }), [current, setCurrent, disabled]);
  return (
    <RadioContext.Provider value={ctx}>
      <View accessibilityRole="radiogroup" {...rest} style={[orientation === 'horizontal' ? styles.row : styles.column, style]} />
    </RadioContext.Provider>
  );
}

export type RadioGroupItemProps = Omit<PressableProps, 'style' | 'children'> & { value: string; disabled?: boolean; style?: StyleProp<ViewStyle> };

export function RadioGroupItem({ value, disabled, style, onPress, ...rest }: RadioGroupItemProps) {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('RadioGroupItem must be used inside <RadioGroup>');
  const theme = useTheme();
  const checked = ctx.value === value;
  const off = ctx.disabled || !!disabled;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: off }}
      disabled={off}
      hitSlop={hitSlopFor(16, 16)}
      {...rest}
      onPress={(e) => {
        onPress?.(e);
        ctx.setValue(value);
      }}
      style={[
        styles.item,
        { borderColor: theme.colors.primary, borderRadius: theme.radius.full, opacity: off ? 0.5 : 1 },
        style,
      ]}
    >
      {checked ? <Circle size={10} color={theme.colors.primary} fill={theme.colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  item: { width: 16, height: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
