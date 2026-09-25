/**
 * VTID-04520 — one way to open a panel, popup or drawer from outside the
 * component that owns it (Vitana's voice navigation, deep links, chips).
 *
 * openOverlay() dispatches a cancelable window CustomEvent. A listener
 * registered with useWindowOverlay() calls preventDefault(), which is how
 * the caller learns the overlay actually opened ("acknowledged"). When
 * nobody is listening yet — the page that owns the overlay is still
 * loading, e.g. Settings right after a route change — the request is kept
 * for a few seconds and handed to the listener when it mounts, instead of
 * being fired into the void on a timer.
 *
 * Plain window.addEventListener listeners keep working; they just cannot
 * acknowledge, so their callers report "unknown" rather than "opened".
 */
import { useEffect, useRef } from 'react';

const PENDING_TTL_MS = 5_000;

interface Pending {
  detail: unknown;
  at: number;
}

const pending = new Map<string, Pending>();

export type OverlayOpenResult = 'acknowledged' | 'queued';

export function openOverlay(event: string, detail: unknown = {}): OverlayOpenResult {
  const e = new CustomEvent(event, { detail, cancelable: true });
  window.dispatchEvent(e);
  if (e.defaultPrevented) {
    pending.delete(event);
    return 'acknowledged';
  }
  pending.set(event, { detail, at: Date.now() });
  return 'queued';
}

/** Take a request made before any listener was mounted (one-shot, bounded age). */
export function takePendingOverlay(event: string, now = Date.now()): unknown | undefined {
  const p = pending.get(event);
  if (!p) return undefined;
  pending.delete(event);
  return now - p.at <= PENDING_TTL_MS ? p.detail : undefined;
}

/** Test helper. */
export function __clearPendingOverlays(): void {
  pending.clear();
}

/**
 * Listen for `event` on window, acknowledge it, and run `handler` with its
 * detail. Also runs `handler` once on mount for a request that arrived
 * before this component existed.
 */
export function useWindowOverlay<T = Record<string, unknown>>(event: string, handler: (detail: T) => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const listener = (e: Event) => {
      e.preventDefault();
      ref.current(((e as CustomEvent).detail ?? {}) as T);
    };
    window.addEventListener(event, listener);
    const early = takePendingOverlay(event);
    if (early !== undefined) ref.current((early ?? {}) as T);
    return () => window.removeEventListener(event, listener);
  }, [event, enabled]);
}
