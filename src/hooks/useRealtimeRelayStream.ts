/**
 * Generic frontend consumer for the gateway's B5 realtime relay routes
 * (`GET /api/v1/realtime/<table>/stream` in vitana-platform's
 * `services/gateway/src/routes/realtime-relay.ts`) — the gateway-owned
 * polling relay built to replace Supabase Realtime's `postgres_changes`
 * subscriptions once Supabase is fully disconnected (see
 * `docs/AURORA-B5-REALTIME-INVENTORY.md`).
 *
 * Extracted from the first relay hook (`useUserNotificationsRealtimeRelay`)
 * once a second and third table needed the identical connect/reconnect/
 * parse logic — this codebase's own CHANGE LOG names the "five copies
 * diverge" failure shape twice already (a language map, a workflow
 * `paths:` list), so a second near-identical hook file was the signal to
 * generalize here rather than copy-paste a third time.
 *
 * **Not used by any component yet — this is deliberate, not an
 * oversight.** Every backend route this powers ships flagged OFF
 * (unset `FEATURE_REALTIME_RELAY_*_ENV`, all return 404), so wiring any
 * consuming hook into a real component today would just retry a 404 in a
 * loop for no benefit. Swapping one in is a separate, later decision that
 * needs its backend flag flipped and live-verified on staging FIRST.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { consumeSseRelay, type SseEvent } from '@/lib/sse-relay-client';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || '';

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export type RelayConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface UseRealtimeRelayStreamOptions<T> {
  /** Relay path under /api/v1/realtime, e.g. 'user-notifications/stream'. */
  path: string;
  /** The SSE `event:` name this relay's rows are sent under (see realtime-relay.ts's streamTable() eventName argument). */
  eventName: string;
  /** Called once per row as it arrives. Does not manage any list state itself — the caller decides how to merge it. */
  onRow: (row: T) => void;
  /** Off by default so importing a wrapper hook has zero effect until a caller opts in explicitly. */
  enabled?: boolean;
  /** Label used only in console diagnostics, so a caller's errors are attributable to the right relay. */
  debugLabel?: string;
}

/**
 * Opens the relay stream while `enabled` is true and the user is signed
 * in, reconnecting on any stream error/close with a fixed backoff (the
 * relay itself does not reconnect — see `consumeSseRelay`'s own doc
 * comment). Returns the current connection status for a caller that
 * wants to show a "live"/"reconnecting" indicator; does not throw.
 */
export function useRealtimeRelayStream<T>(options: UseRealtimeRelayStreamOptions<T>): RelayConnectionStatus {
  const { path, eventName, onRow, enabled = false, debugLabel = path } = options;
  const [status, setStatus] = useState<RelayConnectionStatus>('idle');
  const onRowRef = useRef(onRow);
  onRowRef.current = onRow;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    let stopped = false;
    const RECONNECT_DELAY_MS = 5000;
    const relayUrl = `${GATEWAY_URL}/api/v1/realtime/${path}`;

    const run = async () => {
      while (!stopped) {
        setStatus('connecting');
        try {
          const jwt = await getJwt();
          if (!jwt) {
            setStatus('error');
            await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
            continue;
          }

          setStatus('connected');
          await consumeSseRelay(relayUrl, jwt, {
            signal: controller.signal,
            onEvent: (event: SseEvent) => {
              if (event.event !== eventName) return;
              try {
                onRowRef.current(JSON.parse(event.data) as T);
              } catch (err) {
                console.error(`[useRealtimeRelayStream:${debugLabel}] malformed event payload:`, err);
              }
            },
            onError: (err) => {
              console.error(`[useRealtimeRelayStream:${debugLabel}] handler error:`, err);
            },
          });
        } catch (err) {
          if (stopped) break;
          console.error(`[useRealtimeRelayStream:${debugLabel}] stream error, will retry:`, err);
          setStatus('error');
        }

        if (!stopped) {
          await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
        }
      }
    };

    void run();

    return () => {
      stopped = true;
      controller.abort();
      setStatus('idle');
    };
  }, [enabled, path, eventName]);

  return status;
}
