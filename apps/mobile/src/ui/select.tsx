/**
 * VTID-05176 — Select (web select.tsx, 111 importers). The trigger looks like
 * the web one (rounded-full, the web's raw white/60 · gray-900/40 colours from
 * legacy-literals); the content opens as a BOTTOM-SHEET LIST with a check on
 * the selected item — the system-sheet pattern, a documented native difference
 * from the web's `position="popper"` dropdown (Open question 2). Groups,
 * labels, separators, disabled items and `SelectValue placeholder` work as on
 * the web. Does not suppress the ORB (F20).
 */
import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { useTheme } from './provider/context';
import { legacyColors } from './theme';
import { Text } from './foundation/Text';
import { hitSlopFor } from './foundation/hitSlop';
import { BottomSheet } from './overlay/BottomSheet';
import { OverlayModal } from './overlay/OverlayModal';
import { useControllableState } from './overlay/useControllableState';

type Ctx = {
  value: string;
  setValue: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  disabled: boolean;
  labels: Map<string, string>;
  register: (value: string, label: string) => void;
};
const SelectContext = createContext<Ctx | null>(null);

function useSelect(): Ctx {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be used inside <Select>');
  return ctx;
}

export type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  children?: ReactNode;
};

export function Select({ value, defaultValue = '', onValueChange, open, defaultOpen = false, onOpenChange, disabled = false, children }: SelectProps) {
  const [current, setCurrent] = useControllableState(value, defaultValue, onValueChange);
  const [isOpen, setOpen] = useControllableState(open, defaultOpen, onOpenChange);
  const labelsRef = useRef(new Map<string, string>());
  const [version, bump] = useState(0);
  const register = useCallback((v: string, label: string) => {
    if (labelsRef.current.get(v) === label) return;
    labelsRef.current.set(v, label);
    bump((n) => n + 1);
  }, []);
  const ctx = useMemo(
    () => ({ value: current, setValue: setCurrent, open: isOpen, setOpen, disabled, labels: labelsRef.current, register }),
    // `version` re-renders SelectValue once an item has registered its label.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, setCurrent, isOpen, setOpen, disabled, register, version],
  );
  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ style, children, ...rest }: Omit<PressableProps, 'children'> & { children?: ReactNode }) {
  const { open, setOpen, disabled } = useSelect();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityState={{ expanded: open, disabled }}
      disabled={disabled}
      hitSlop={hitSlopFor(44, 40)}
      {...rest}
      onPress={(e) => {
        rest.onPress?.(e);
        setOpen(!open);
      }}
      style={(state) => [
        styles.trigger,
        {
          borderRadius: theme.radius.full,
          borderColor: open ? legacyColors.selectTriggerFocusBorder : legacyColors.selectTriggerBorder,
          backgroundColor: legacyColors.selectTriggerBg[theme.scheme],
          opacity: disabled ? 0.5 : 1,
          ...theme.elevation.sm,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View style={styles.triggerValue}>{children}</View>
      <ChevronDown size={16} color={theme.colors.mutedForeground} style={styles.chevron} />
    </Pressable>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelect();
  const label = value ? labels.get(value) : undefined;
  return label ? (
    <Text size="sm" numberOfLines={1}>
      {label}
    </Text>
  ) : (
    <Text size="sm" muted numberOfLines={1}>
      {placeholder ?? ''}
    </Text>
  );
}

function textOf(node: ReactNode): string {
  let out = '';
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') out += String(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) out += textOf(child.props.children);
  });
  return out;
}

const ContentModeContext = createContext<'hidden' | 'open'>('open');

export function SelectContent({ style, children, testID = 'select' }: ViewProps & { position?: 'popper' | 'item-aligned'; children?: ReactNode }) {
  const { open, setOpen } = useSelect();
  const theme = useTheme();
  return (
    <>
      {/* Closed: items stay mounted (hidden) so SelectValue knows their labels, like Radix. */}
      {!open ? (
        <ContentModeContext.Provider value="hidden">
          <View style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {children}
          </View>
        </ContentModeContext.Provider>
      ) : null}
      <OverlayModal open={open} onOpenChange={setOpen} suppressOrb={false} backdropColor={legacyColors.overlayResponsive} durationMs={theme.motion.sheetMs} testID={testID}>
        <BottomSheet testID={`${testID}-content`} style={style}>
          <ScrollView accessibilityRole="list" contentContainerStyle={styles.list}>
            <ContentModeContext.Provider value="open">{children}</ContentModeContext.Provider>
          </ScrollView>
        </BottomSheet>
      </OverlayModal>
    </>
  );
}

export function SelectGroup(props: ViewProps) {
  return <View accessibilityRole="none" {...props} />;
}

export function SelectLabel({ style, ...props }: ViewProps & { children?: ReactNode }) {
  return (
    <View style={[styles.label, style]}>
      <Text size="sm" weight="600" {...props} />
    </View>
  );
}

export type SelectItemProps = Omit<PressableProps, 'children'> & { value: string; disabled?: boolean; children?: ReactNode };

export function SelectItem({ value, disabled, style, children, ...rest }: SelectItemProps) {
  const { value: selectedValue, setValue, setOpen, register } = useSelect();
  const mode = useContext(ContentModeContext);
  const theme = useTheme();
  const label = textOf(children);
  useEffect(() => {
    register(value, label);
  }, [register, value, label]);
  if (mode === 'hidden') return null;
  const selected = selectedValue === value;
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      onPress={(e) => {
        rest.onPress?.(e);
        setValue(value);
        setOpen(false);
      }}
      style={(state) => [
        styles.item,
        { borderRadius: theme.radius.sm, opacity: disabled ? 0.5 : 1 },
        state.pressed && { backgroundColor: theme.colors.accent },
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <View style={styles.check}>{selected ? <Check size={16} color={theme.colors.foreground} /> : null}</View>
      {typeof children === 'string' ? (
        <Text size="base" style={styles.itemText}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function SelectSeparator({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return <View {...props} style={[styles.separator, { backgroundColor: theme.colors.muted }, style]} />;
}

/** Native lists scroll themselves; kept so ports compile. */
export function SelectScrollUpButton(_props: ViewProps) {
  return null;
}
export function SelectScrollDownButton(_props: ViewProps) {
  return null;
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40, width: '100%', borderWidth: 1, paddingHorizontal: 16 },
  triggerValue: { flex: 1 },
  chevron: { opacity: 0.5 },
  hidden: { display: 'none' },
  list: { paddingHorizontal: 8, paddingBottom: 8 },
  label: { paddingVertical: 6, paddingStart: 32, paddingEnd: 8 },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingEnd: 8 },
  check: { width: 32, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  separator: { height: 1, marginVertical: 4, marginHorizontal: -4 },
});
