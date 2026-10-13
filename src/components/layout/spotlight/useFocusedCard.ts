import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * VTID-05105 — focus-feed behaviour (contract R4.2–R4.3).
 *
 * The focused card is the one crossing the stage's vertical centre line
 * (IntersectionObserver with a zero-height band at 50 %). Free scrolling — no
 * scroll-snap. `J`/`K` and ↓/↑ scroll the next/previous card into view,
 * unless the user is typing. Instant under `prefers-reduced-motion`.
 */
const TYPING = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function nextIndexForKey(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  if (key === 'j' || key === 'J' || key === 'ArrowDown') return Math.min(count - 1, current + 1);
  if (key === 'k' || key === 'K' || key === 'ArrowUp') return Math.max(0, current - 1);
  return null;
}

export function useFocusedCard(containerRef: RefObject<HTMLElement>, selector = '[data-vcard-size="spotlight"]') {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedRef = useRef(0);
  focusedRef.current = focusedIndex;

  const cards = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(selector) ?? []),
    [containerRef, selector],
  );

  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        const i = cards().indexOf(hit.target as HTMLElement);
        if (i >= 0) setFocusedIndex(i);
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    );
    const observeAll = () => {
      io.disconnect();
      cards().forEach((c) => io.observe(c));
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [containerRef, cards]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as Element | null;
      if (target?.closest?.(TYPING)) return;
      const list = cards();
      const next = nextIndexForKey(e.key, focusedRef.current, list.length);
      if (next === null) return;
      e.preventDefault();
      setFocusedIndex(next);
      list[next]?.scrollIntoView?.({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cards]);

  return { focusedIndex, setFocusedIndex };
}
