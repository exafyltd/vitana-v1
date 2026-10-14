/**
 * VTID-05176 — Popover (web popover.tsx): anchored to its trigger via
 * `measureInWindow`; `side` / `align` / `sideOffset` (default 4), clamped to the
 * safe area, flips when there is no room; `align` start/end follow direction.
 * A backdrop tap closes it. `w-72 rounded-md border bg-popover p-4 shadow-md`.
 * Does not suppress the ORB (F20).
 */
import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type View, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';
import { Slot } from './foundation/Slot';
import { Text } from './foundation/Text';
import { OverlayModal } from './overlay/OverlayModal';
import { Anchored, measureAnchor } from './overlay/Anchored';
import { useControllableState } from './overlay/useControllableState';
import type { Align, Rect, Side } from './overlay/placement';

type Ctx = { open: boolean; setOpen: (o: boolean) => void; anchor: Rect | null; setAnchor: (r: Rect | null) => void; triggerRef: React.RefObject<View | null> };
const PopoverContext = createContext<Ctx | null>(null);

function usePopover(): Ctx {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error('Popover components must be used inside <Popover>');
  return ctx;
}

export type PopoverProps = { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; children?: ReactNode };

export function Popover({ open, defaultOpen = false, onOpenChange, children }: PopoverProps) {
  const [value, setValue] = useControllableState(open, defaultOpen, onOpenChange);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const triggerRef = useRef<View | null>(null);
  const ctx = useMemo(() => ({ open: value, setOpen: setValue, anchor, setAnchor, triggerRef }), [value, setValue, anchor]);
  return <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ asChild, children, onPress, ...rest }: Omit<PressableProps, 'children'> & { asChild?: boolean; children?: ReactNode }) {
  const { open, setOpen, setAnchor, triggerRef } = usePopover();
  const press = (e: GestureResponderEvent) => {
    onPress?.(e);
    if (open) {
      setOpen(false);
      return;
    }
    // Open at once; the content stays invisible until the trigger is measured.
    setAnchor(null);
    setOpen(true);
    measureAnchor(triggerRef.current, setAnchor);
  };
  if (asChild) {
    return (
      <Slot {...rest} ref={triggerRef} collapsable={false} accessibilityState={{ expanded: open }} onPress={press}>
        {children}
      </Slot>
    );
  }
  return (
    <Pressable ref={triggerRef} accessibilityRole="button" accessibilityState={{ expanded: open }} {...rest} onPress={press}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

export type PopoverContentProps = ViewProps & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
  children?: ReactNode;
};

export function PopoverContent({ side = 'bottom', align = 'center', sideOffset = 4, style, children, testID = 'popover' }: PopoverContentProps) {
  const { open, setOpen, anchor } = usePopover();
  const theme = useTheme();
  return (
    <OverlayModal open={open} onOpenChange={setOpen} suppressOrb={false} backdropColor={null} durationMs={theme.motion.crossFadeMs} testID={testID}>
      <Anchored
        anchor={anchor}
        side={side}
        align={align}
        sideOffset={sideOffset}
        testID={`${testID}-content`}
        accessibilityViewIsModal
        style={[
          {
            width: 288,
            padding: 16,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.popover,
            borderColor: theme.colors.border,
            ...theme.elevation.md,
          },
          style,
        ]}
      >
        {children}
      </Anchored>
    </OverlayModal>
  );
}
