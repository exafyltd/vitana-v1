/**
 * VTID-05176 — Tabs (web tabs.tsx): Root / List / Trigger / Content with
 * `value`, `defaultValue`, `onValueChange`. Roles `tablist` / `tab` with the
 * `selected` state; `TabsContent` renders only the active value.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';
import { Text } from './foundation/Text';
import { hitSlopFor } from './foundation/hitSlop';
import { useControllableState } from './overlay/useControllableState';

type Ctx = { value: string; setValue: (v: string) => void };
const TabsContext = createContext<Ctx | null>(null);

function useTabs(): Ctx {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>');
  return ctx;
}

export type TabsProps = ViewProps & { value?: string; defaultValue?: string; onValueChange?: (value: string) => void; children?: ReactNode };

export function Tabs({ value, defaultValue = '', onValueChange, ...rest }: TabsProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange);
  const ctx = useMemo(() => ({ value: current, setValue: setCurrent }), [current, setCurrent]);
  return (
    <TabsContext.Provider value={ctx}>
      <View {...rest} />
    </TabsContext.Provider>
  );
}

export function TabsList({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      {...rest}
      style={[styles.list, { backgroundColor: theme.colors.muted, borderRadius: theme.radius.md }, style]}
    />
  );
}

export type TabsTriggerProps = Omit<PressableProps, 'children'> & { value: string; children?: ReactNode };

export function TabsTrigger({ value, disabled, style, children, onPress, ...rest }: TabsTriggerProps) {
  const { value: active, setValue } = useTabs();
  const theme = useTheme();
  const selected = active === value;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={hitSlopFor(44, 32)}
      {...rest}
      onPress={(e) => {
        onPress?.(e);
        setValue(value);
      }}
      style={(state) => [
        styles.trigger,
        { borderRadius: theme.radius.sm, opacity: disabled ? 0.5 : 1 },
        selected && { backgroundColor: theme.colors.background, ...theme.elevation.sm },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text size="sm" weight="500" numberOfLines={1} color={selected ? theme.colors.foreground : theme.colors.mutedForeground}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export type TabsContentProps = ViewProps & { value: string; forceMount?: boolean };

export function TabsContent({ value, forceMount, style, ...rest }: TabsContentProps) {
  const { value: active } = useTabs();
  if (active !== value && !forceMount) return null;
  return <View accessibilityRole="none" {...rest} style={[styles.content, active !== value && styles.hidden, style]} />;
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, padding: 4 },
  trigger: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 },
  content: { marginTop: 8 },
  hidden: { display: 'none' },
});
