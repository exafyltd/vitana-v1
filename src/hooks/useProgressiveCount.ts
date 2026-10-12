import { useEffect, useState } from 'react';

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * VTID-05081 (amendment A2): how many items of a long list to render right now.
 *
 * Starts at `min(total, initial)` so the first commit stays small, then grows by
 * `step` per idle callback until it reaches `total` (and keeps growing when
 * `total` grows). The end state is the full list; only the first paint is
 * cheaper. Pure render-count logic — it never touches data.
 */
export function useProgressiveCount(
  total: number,
  { initial = 24, step = 40, resetKey }: { initial?: number; step?: number; resetKey?: unknown } = {},
): number {
  const [count, setCount] = useState(() => Math.min(total, initial));
  // A new list (resetKey changed, e.g. another inbox context) starts small again.
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setCount(Math.min(total, initial));
  }

  useEffect(() => {
    if (count >= total) return;
    const w = window as IdleWindow;
    const grow = () => setCount((c) => Math.min(total, Math.max(c, Math.min(total, initial)) + step));
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(grow, { timeout: 300 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(grow, 50);
    return () => window.clearTimeout(id);
  }, [count, total, initial, step]);

  return Math.min(total, Math.max(count, Math.min(total, initial)));
}
