import { useLayoutEffect, type RefObject } from 'react';

/**
 * VTID-05110 — keeps an element exactly as tall as the viewport space below
 * its own top edge, so a conversation's message list scrolls inside the
 * thread stage and its composer stays on screen (the legacy desktop inbox
 * did this with a fixed `100dvh` frame).
 *
 * Measured, not a CSS calc: the chrome above (SubNavigation, compact header,
 * utility row) has no fixed height, and the contract forbids arbitrary
 * `h-[…]` sizes. Re-measured on window resize and whenever the document
 * resizes (e.g. the header finishes loading); a value that has not changed is
 * not written again, so this cannot loop.
 */
export function fillHeight(docTop: number, viewportHeight: number, bottomGap: number, minHeight: number): number {
  return Math.max(minHeight, Math.floor(viewportHeight - docTop - bottomGap));
}

export function useFillViewport(ref: RefObject<HTMLElement>, active = true, { bottomGap = 48, minHeight = 420 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof window === 'undefined') return;
    let last = -1;
    const measure = () => {
      const docTop = el.getBoundingClientRect().top + window.scrollY;
      const next = fillHeight(docTop, window.innerHeight, bottomGap, minHeight);
      if (next !== last) {
        last = next;
        el.style.height = `${next}px`;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [ref, active, bottomGap, minHeight]);
}
