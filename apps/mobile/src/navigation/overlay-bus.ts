/**
 * VTID-05186 (N3, plan change 19 / I-SH.2) — the native event bus.
 *
 * Same event names as the web's window events (`src/navigation/overlay-bus.ts`
 * and the `role.changed` / `tenant.changed` CustomEvents), so screen lanes
 * register their sheets (`calendar:open`, `autopilot:open`, `wallet:open`,
 * `notifications:open`) without the shell knowing them.
 */
import { useEffect, useRef } from 'react';

export type BusEvent =
  | 'calendar:open'
  | 'autopilot:open'
  | 'wallet:open'
  | 'notifications:open'
  | 'adminInBrowser:open'
  | 'role.changed'
  | 'tenant.changed'
  | (string & {});

type Handler = (detail?: unknown) => void;

const handlers = new Map<string, Set<Handler>>();

export const overlayBus = {
  emit(event: BusEvent, detail?: unknown): void {
    for (const h of [...(handlers.get(event) ?? [])]) {
      try {
        h(detail);
      } catch {
        /* one listener never breaks another */
      }
    }
  },
  on(event: BusEvent, handler: Handler): () => void {
    let set = handlers.get(event);
    if (!set) handlers.set(event, (set = new Set()));
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  },
  /**
   * How many handlers are registered for `event`. VTID-05182: the ORB's
   * navigation directives open a native overlay only when a screen lane has
   * registered it, and report `not_found` otherwise.
   */
  listenerCount(event: BusEvent): number {
    return handlers.get(event)?.size ?? 0;
  },
  /** Test helper. */
  clear(): void {
    handlers.clear();
  },
};

/** Subscribes while mounted (and `enabled`); the latest handler is always called. */
export function useBusEvent<T = unknown>(event: BusEvent, handler: (detail?: T) => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return undefined;
    return overlayBus.on(event, (d) => ref.current(d as T));
  }, [event, enabled]);
}
