/**
 * VTID-05176 — overlay stack and ORB suppression (plan change 9).
 *
 * Every open overlay registers here, in open order, so the toast host can
 * render inside the top-most one. Exactly the overlays that suppress the ORB
 * on the web (dialog, sheet, drawer, responsive-dialog — useOrbSuppression.ts,
 * F20) count towards `useOrbSuppressed()`; popovers, selects, tooltips,
 * alert/confirm dialogs do not. The count is ref-counted, so nesting works.
 */
import { useEffect, useId, useSyncExternalStore } from 'react';

type Entry = { id: string; suppressOrb: boolean; depth: number; seq: number };

let entries: readonly Entry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of [...listeners]) l();
}

/**
 * `depth` is the overlay's nesting level (an overlay opened from inside another
 * is one deeper). React runs a child's effects before its parent's, so two
 * overlays opened in the same render would otherwise register child-first; the
 * stack is ordered by depth, then by open order.
 */
export function pushOverlay(id: string, suppressOrb: boolean, depth = 1): void {
  seq += 1;
  entries = [...entries.filter((e) => e.id !== id), { id, suppressOrb, depth, seq }].sort((a, b) => a.depth - b.depth || a.seq - b.seq);
  emit();
}

export function removeOverlay(id: string): void {
  const next = entries.filter((e) => e.id !== id);
  if (next.length !== entries.length) {
    entries = next;
    emit();
  }
}

export function subscribeOverlayStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getTopOverlayId(): string | null {
  return entries.length ? entries[entries.length - 1].id : null;
}

export function getOrbSuppressionCount(): number {
  return entries.filter((e) => e.suppressOrb).length;
}

/** True while at least one ORB-suppressing overlay is open (N6 hides the ORB FAB). */
export function isOrbSuppressed(): boolean {
  return getOrbSuppressionCount() > 0;
}

/** Calls `listener(suppressed)` whenever the suppressed state flips. Returns an unsubscribe. */
export function subscribeOrbSuppression(listener: (suppressed: boolean) => void): () => void {
  let last = isOrbSuppressed();
  return subscribeOverlayStack(() => {
    const now = isOrbSuppressed();
    if (now !== last) {
      last = now;
      listener(now);
    }
  });
}

export function useOrbSuppressed(): boolean {
  return useSyncExternalStore(subscribeOverlayStack, isOrbSuppressed, isOrbSuppressed);
}

export function useTopOverlayId(): string | null {
  return useSyncExternalStore(subscribeOverlayStack, getTopOverlayId, getTopOverlayId);
}

/** Registers an overlay while `open`; returns its stable id. */
export function useOverlayEntry(open: boolean, suppressOrb: boolean, depth = 1): string {
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    pushOverlay(id, suppressOrb, depth);
    return () => removeOverlay(id);
  }, [id, open, suppressOrb, depth]);
  return id;
}

/** Test helper: forget every registered overlay. */
export function __resetOverlayStack(): void {
  entries = [];
  seq = 0;
  emit();
}
