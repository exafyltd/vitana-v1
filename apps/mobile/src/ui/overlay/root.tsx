/**
 * VTID-05176 — Radix-style Root / Trigger / Close for every overlay
 * (open, defaultOpen, onOpenChange; `asChild` on Trigger and Close).
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import { Slot } from '../foundation/Slot';
import { Text } from '../foundation/Text';
import { useControllableState } from './useControllableState';

export type OverlayRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

export type OverlayState = { open: boolean; setOpen: (open: boolean) => void };

export type TriggerProps = Omit<PressableProps, 'children'> & { asChild?: boolean; children?: ReactNode };

export function createOverlayRoot(name: string) {
  const Ctx = createContext<OverlayState | null>(null);

  function Root({ open, defaultOpen = false, onOpenChange, children }: OverlayRootProps) {
    const [value, setValue] = useControllableState(open, defaultOpen, onOpenChange);
    const state = useMemo(() => ({ open: value, setOpen: setValue }), [value, setValue]);
    return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
  }

  function useRoot(): OverlayState {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error(`${name} components must be used inside <${name}>`);
    return ctx;
  }

  function makeButton(target: boolean, display: string) {
    function Btn({ asChild, children, onPress, ...rest }: TriggerProps) {
      const { open, setOpen } = useRoot();
      const press = (e: GestureResponderEvent) => {
        onPress?.(e);
        setOpen(target);
      };
      const a11y = target ? { accessibilityState: { expanded: open } } : {};
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
    Btn.displayName = `${name}${display}`;
    return Btn;
  }

  return { Root, useRoot, Trigger: makeButton(true, 'Trigger'), Close: makeButton(false, 'Close') };
}

/** Web `*Portal` is a no-op on native: every overlay is already a Modal. */
export function Portal({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

/** Web `*Overlay` is rendered by the content on native (style it with `overlayStyle`). */
export function NoopOverlay(_props: { style?: unknown }) {
  return null;
}
