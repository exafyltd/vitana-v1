/** VTID-05176 — Collapsible (web collapsible.tsx, Radix API): `open`, `defaultOpen`, `onOpenChange`, `disabled`. */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent, type PressableProps, type ViewProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from './provider/context';
import { Slot } from './foundation/Slot';
import { Text } from './foundation/Text';
import { useControllableState } from './overlay/useControllableState';

type Ctx = { open: boolean; setOpen: (o: boolean) => void; disabled: boolean };
const CollapsibleContext = createContext<Ctx | null>(null);

function useCollapsible(): Ctx {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) throw new Error('Collapsible parts must be used inside <Collapsible>');
  return ctx;
}

export type CollapsibleProps = ViewProps & { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; disabled?: boolean };

export function Collapsible({ open, defaultOpen = false, onOpenChange, disabled = false, ...rest }: CollapsibleProps) {
  const [value, setValue] = useControllableState(open, defaultOpen, onOpenChange);
  const ctx = useMemo(() => ({ open: value, setOpen: setValue, disabled }), [value, setValue, disabled]);
  return (
    <CollapsibleContext.Provider value={ctx}>
      <View {...rest} />
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({ asChild, children, onPress, ...rest }: Omit<PressableProps, 'children'> & { asChild?: boolean; children?: ReactNode }) {
  const { open, setOpen, disabled } = useCollapsible();
  const press = (e: GestureResponderEvent) => {
    onPress?.(e);
    setOpen(!open);
  };
  const a11y = { accessibilityState: { expanded: open, disabled }, disabled };
  if (asChild) {
    return (
      <Slot {...rest} {...a11y} onPress={press}>
        {children}
      </Slot>
    );
  }
  return (
    <Pressable accessibilityRole="button" {...a11y} {...rest} onPress={press}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

export function CollapsibleContent({ forceMount, ...rest }: ViewProps & { forceMount?: boolean }) {
  const { open } = useCollapsible();
  const theme = useTheme();
  if (!open && !forceMount) return null;
  return <Animated.View entering={theme.reducedMotion ? undefined : FadeIn.duration(theme.motion.crossFadeMs)} {...rest} />;
}
