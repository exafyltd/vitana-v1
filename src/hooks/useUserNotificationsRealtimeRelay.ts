/**
 * Frontend consumer for the gateway's B5 realtime relay
 * (`GET /api/v1/realtime/user-notifications/stream` in
 * vitana-platform's `services/gateway/src/routes/realtime-relay.ts`),
 * the gateway-owned polling relay built to replace Supabase Realtime's
 * `postgres_changes` subscription once Supabase is fully disconnected
 * (see `docs/AURORA-B5-REALTIME-INVENTORY.md`).
 *
 * **Not used by any component yet — this is deliberate, not an
 * oversight.** The backend route ships flagged OFF
 * (`FEATURE_REALTIME_RELAY_USER_NOTIFICATIONS_ENV`, unset everywhere
 * today, returns 404), so calling this hook from `useNotifications.ts`'s
 * existing Supabase Realtime subscription today would just retry a 404
 * in a loop for no benefit. Swapping it in is a separate, later decision
 * that needs the backend flag flipped and live-verified on staging
 * FIRST — see the inventory doc's own "next real step" notes. This hook
 * exists so that swap is a small, already-tested change when someone
 * makes that call, not a from-scratch build.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { consumeSseRelay, type SseEvent } from '@/lib/sse-relay-client';
import type { VitanaNotification } from './useNotifications';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || '';
const RELAY_URL = `${GATEWAY_URL}/api/v1/realtime/user-notifications/stream`;

async function getJwt(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export interface UseUserNotificationsRealtimeRelayOptions {
  /** Called once per notification as it arrives. Does not manage any list state itself — the caller decides how to merge it. */
  onNotification: (notification: VitanaNotification) => void;
  /** Off by default so importing this hook has zero effect until a caller opts in explicitly. */
  enabled?: boolean;
}

export type RelayConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Opens the relay stream while `enabled` is true and the user is signed
 * in, reconnecting on any stream error/close with a fixed backoff (the
 * relay itself does not reconnect — see `consumeSseRelay`'s own doc
 * comment). Returns the current connection status for a caller that
 * wants to show a "live"/"reconnecting" indicator; does not throw.
 */
export function useUserNotificationsRealtimeRelay(options: UseUserNotificationsRealtimeRelayOptions): RelayConnectionStatus {
  const { onNotification, enabled = false } = options;
  const [status, setStatus] = useState<RelayConnectionStatus>('idle');
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    let stopped = false;
    const RECONNECT_DELAY_MS = 5000;

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
          await consumeSseRelay(RELAY_URL, jwt, {
            signal: controller.signal,
            onEvent: (event: SseEvent) => {
              if (event.event !== 'user_notification') return;
              try {
                onNotificationRef.current(JSON.parse(event.data) as VitanaNotification);
              } catch (err) {
                console.error('[useUserNotificationsRealtimeRelay] malformed event payload:', err);
              }
            },
            onError: (err) => {
              console.error('[useUserNotificationsRealtimeRelay] handler error:', err);
            },
          });
        } catch (err) {
          if (stopped) break;
          console.error('[useUserNotificationsRealtimeRelay] stream error, will retry:', err);
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
  }, [enabled]);

  return status;
}
