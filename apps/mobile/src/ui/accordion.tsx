/**
 * VTID-05176 — Accordion (web accordion.tsx, Radix API): `type single |
 * multiple`, `collapsible`, `value` / `defaultValue` / `onValueChange`; the
 * item's height animates (Reanimated layout transition, off under reduced
 * motion); `expanded` state on the trigger.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from './provider/context';
import { Text } from './foundation/Text';
import { useControllableState } from './overlay/useControllableState';

type RootCtx = { isOpen: (v: string) => boolean; toggle: (v: string) => void; disabled: boolean };
const AccordionContext = createContext<RootCtx | null>(null);
const ItemContext = createContext<{ value: string; open: boolean; disabled: boolean } | null>(null);

type SingleProps = { type: 'single'; value?: string; defaultValue?: string; onValueChange?: (value: string) => void; collapsible?: boolean };
type MultipleProps = { type: 'multiple'; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void };
export type AccordionProps = ViewProps & (SingleProps | MultipleProps) & { disabled?: boolean; children?: ReactNode };

function SingleRoot({ value, defaultValue = '', onValueChange, collapsible = false, disabled = false, children, ...rest }: ViewProps & Omit<SingleProps, 'type'> & { disabled?: boolean }) {
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange);
  const ctx = useMemo<RootCtx>(
    () => ({
      isOpen: (v) => current === v,
      toggle: (v) => {
        if (current === v) {
          if (collapsible) setCurrent('');
        } else setCurrent(v);
      },
      disabled,
    }),
    [current, setCurrent, collapsible, disabled],
  );
  return (
    <AccordionContext.Provider value={ctx}>
      <View {...rest}>{children}</View>
    </AccordionContext.Provider>
  );
}

function MultipleRoot({ value, defaultValue = [], onValueChange, disabled = false, children, ...rest }: ViewProps & Omit<MultipleProps, 'type'> & { disabled?: boolean }) {
  const [current, setCurrent] = useControllableState<string[]>(value, defaultValue, onValueChange);
  const ctx = useMemo<RootCtx>(
    () => ({
      isOpen: (v) => current.includes(v),
      toggle: (v) => setCurrent(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]),
      disabled,
    }),
    [current, setCurrent, disabled],
  );
  return (
    <AccordionContext.Provider value={ctx}>
      <View {...rest}>{children}</View>
    </AccordionContext.Provider>
  );
}

export function Accordion(props: AccordionProps) {
  if (props.type === 'multiple') {
    const { type: _t, ...rest } = props;
    return <MultipleRoot {...rest} />;
  }
  const { type: _t, ...rest } = props;
  return <SingleRoot {...rest} />;
}

export function AccordionItem({ value, disabled, style, ...rest }: ViewProps & { value: string; disabled?: boolean }) {
  const root = useContext(AccordionContext);
  if (!root) throw new Error('AccordionItem must be used inside <Accordion>');
  const theme = useTheme();
  const open = root.isOpen(value);
  const item = useMemo(() => ({ value, open, disabled: root.disabled || !!disabled }), [value, open, root.disabled, disabled]);
  return (
    <ItemContext.Provider value={item}>
      <Animated.View
        layout={theme.reducedMotion ? undefined : LinearTransition.duration(theme.motion.dialogMs)}
        {...rest}
        style={[{ borderBottomWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }, style]}
      />
    </ItemContext.Provider>
  );
}

function useItem() {
  const root = useContext(AccordionContext);
  const item = useContext(ItemContext);
  if (!root || !item) throw new Error('Accordion parts must be used inside <AccordionItem>');
  return { root, item };
}

export function AccordionTrigger({ children, style, onPress, ...rest }: Omit<PressableProps, 'children'> & { children?: ReactNode }) {
  const { root, item } = useItem();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: item.open, disabled: item.disabled }}
      disabled={item.disabled}
      {...rest}
      onPress={(e) => {
        onPress?.(e);
        root.toggle(item.value);
      }}
      style={(state) => [styles.trigger, { opacity: item.disabled ? 0.5 : 1 }, typeof style === 'function' ? style(state) : style]}
    >
      {typeof children === 'string' ? (
        <Text weight="500" style={styles.triggerText}>
          {children}
        </Text>
      ) : (
        <View style={styles.triggerText}>{children}</View>
      )}
      <ChevronDown size={16} color={theme.colors.foreground} style={{ transform: [{ rotate: item.open ? '180deg' : '0deg' }] }} />
    </Pressable>
  );
}

export function AccordionContent({ children, style, ...rest }: ViewProps & { children?: ReactNode }) {
  const { item } = useItem();
  const theme = useTheme();
  if (!item.open) return null;
  return (
    <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.crossFadeMs)} {...rest} style={[styles.content, style]}>
      {typeof children === 'string' ? <Text size="sm">{children}</Text> : children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, minHeight: 44 },
  triggerText: { flex: 1 },
  content: { paddingBottom: 16 },
});
