/**
 * VTID-05176 — Tooltip → a LONG-PRESS HINT (documented native difference: there
 * is no hover). Long-pressing the trigger shows the content bubble anchored
 * like a popover (default side `top`, `sideOffset` 4); it hides 1.5 s after
 * release. A string content is also set as the trigger's `accessibilityHint`.
 * `TooltipProvider` is accepted (`delayDuration` ignored).
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type View, type ViewProps } from 'react-native';
import { useTheme } from './provider/context';
import { Slot } from './foundation/Slot';
import { Text } from './foundation/Text';
import { OverlayModal } from './overlay/OverlayModal';
import { Anchored, measureAnchor } from './overlay/Anchored';
import { useControllableState } from './overlay/useControllableState';
import type { Align, Rect, Side } from './overlay/placement';

export const TOOLTIP_HIDE_DELAY_MS = 1500;

type Ctx = {
  open: boolean;
  setOpen: (o: boolean) => void;
  anchor: Rect | null;
  setAnchor: (r: Rect | null) => void;
  hint: string | undefined;
  setHint: (h: string | undefined) => void;
  triggerRef: React.RefObject<View | null>;
};
const TooltipContext = createContext<Ctx | null>(null);

function useTooltip(): Ctx {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error('Tooltip components must be used inside <Tooltip>');
  return ctx;
}

export function TooltipProvider({ children }: { delayDuration?: number; skipDelayDuration?: number; children?: ReactNode }) {
  return <>{children}</>;
}

export type TooltipProps = { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; delayDuration?: number; children?: ReactNode };

export function Tooltip({ open, defaultOpen = false, onOpenChange, children }: TooltipProps) {
  const [value, setValue] = useControllableState(open, defaultOpen, onOpenChange);
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [hint, setHint] = useState<string | undefined>(undefined);
  const triggerRef = useRef<View | null>(null);
  const ctx = useMemo(() => ({ open: value, setOpen: setValue, anchor, setAnchor, hint, setHint, triggerRef }), [value, setValue, anchor, hint]);
  return <TooltipContext.Provider value={ctx}>{children}</TooltipContext.Provider>;
}

export function TooltipTrigger({ asChild, children, onLongPress, onPressOut, ...rest }: Omit<PressableProps, 'children'> & { asChild?: boolean; children?: ReactNode }) {
  const { open, setOpen, setAnchor, hint, triggerRef } = useTooltip();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const longPress = (e: GestureResponderEvent) => {
    onLongPress?.(e);
    if (timer.current) clearTimeout(timer.current);
    setAnchor(null);
    setOpen(true);
    measureAnchor(triggerRef.current, setAnchor);
  };
  const pressOut = (e: GestureResponderEvent) => {
    onPressOut?.(e);
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), TOOLTIP_HIDE_DELAY_MS);
  };
  const shared = { accessibilityHint: rest.accessibilityHint ?? hint, onLongPress: longPress, onPressOut: pressOut };
  if (asChild) {
    return (
      <Slot {...rest} {...shared} ref={triggerRef} collapsable={false}>
        {children}
      </Slot>
    );
  }
  return (
    <Pressable ref={triggerRef} accessibilityRole="button" {...rest} {...shared}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  );
}

export type TooltipContentProps = ViewProps & { side?: Side; align?: Align; sideOffset?: number; children?: ReactNode };

export function TooltipContent({ side = 'top', align = 'center', sideOffset = 4, style, children, testID = 'tooltip' }: TooltipContentProps) {
  const { open, setOpen, anchor, setHint } = useTooltip();
  const theme = useTheme();
  const text = typeof children === 'string' ? children : undefined;
  useEffect(() => {
    setHint(text);
  }, [text, setHint]);
  return (
    <OverlayModal open={open} onOpenChange={setOpen} suppressOrb={false} backdropColor={null} durationMs={theme.motion.crossFadeMs} testID={testID}>
      <Anchored
        anchor={anchor}
        side={side}
        align={align}
        sideOffset={sideOffset}
        testID={`${testID}-content`}
        style={[
          {
            maxWidth: 280,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.popover,
            borderColor: theme.colors.border,
            ...theme.elevation.md,
          },
          style,
        ]}
      >
        {text !== undefined ? (
          <Text size="sm" color={theme.colors.popoverForeground}>
            {text}
          </Text>
        ) : (
          children
        )}
      </Anchored>
    </OverlayModal>
  );
}
