/**
 * VTID-05176 — Slot (`asChild`, 152 web uses): renders its single child and
 * merges `onPress`, `style`, `disabled` and the accessibility props into it,
 * like @radix-ui/react-slot. The child's own handler runs first, then the slot's.
 */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

type AnyProps = Record<string, unknown>;

const HANDLERS = ['onPress', 'onPressIn', 'onPressOut', 'onLongPress'] as const;

export function mergeSlotProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };
  for (const key of HANDLERS) {
    const a = childProps[key];
    const b = slotProps[key];
    if (typeof a === 'function' && typeof b === 'function') {
      merged[key] = (...args: unknown[]) => {
        (a as (...x: unknown[]) => void)(...args);
        (b as (...x: unknown[]) => void)(...args);
      };
    } else {
      merged[key] = a ?? b;
    }
  }
  if (slotProps.style !== undefined || childProps.style !== undefined) {
    merged.style = [slotProps.style, childProps.style];
  }
  if (slotProps.disabled !== undefined || childProps.disabled !== undefined) {
    merged.disabled = Boolean(slotProps.disabled) || Boolean(childProps.disabled);
  }
  if (slotProps.accessibilityState || childProps.accessibilityState) {
    merged.accessibilityState = { ...(slotProps.accessibilityState as object), ...(childProps.accessibilityState as object) };
  }
  return merged;
}

export type SlotProps = AnyProps & { children?: ReactNode };

export function Slot({ children, ...slotProps }: SlotProps) {
  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const el = child as ReactElement<AnyProps>;
  return cloneElement(el, mergeSlotProps(slotProps, el.props));
}
