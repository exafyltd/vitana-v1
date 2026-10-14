/** VTID-05176 — Radix-style controlled/uncontrolled state (`value` + `defaultValue` + `onChange`). */
import { useCallback, useRef, useState } from 'react';

export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const ref = useRef(current);
  ref.current = current;
  const set = useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      if (!Object.is(next, ref.current)) onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set];
}
