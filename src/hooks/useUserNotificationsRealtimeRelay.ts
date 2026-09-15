/**
 * Frontend consumer for the gateway's B5 realtime relay
 * (`GET /api/v1/realtime/user-notifications/stream` in
 * vitana-platform's `services/gateway/src/routes/realtime-relay.ts`).
 * Thin wrapper over the shared `useRealtimeRelayStream` — see that file's
 * doc comment for why this hook isn't wired into any component yet, and
 * why the connect/reconnect/parse logic itself moved there once a second
 * relay (`user_activity_log`) needed the identical implementation.
 */

import { useRealtimeRelayStream, type RelayConnectionStatus } from './useRealtimeRelayStream';
import type { VitanaNotification } from './useNotifications';

export type { RelayConnectionStatus };

export interface UseUserNotificationsRealtimeRelayOptions {
  /** Called once per notification as it arrives. Does not manage any list state itself — the caller decides how to merge it. */
  onNotification: (notification: VitanaNotification) => void;
  /** Off by default so importing this hook has zero effect until a caller opts in explicitly. */
  enabled?: boolean;
}

export function useUserNotificationsRealtimeRelay(options: UseUserNotificationsRealtimeRelayOptions): RelayConnectionStatus {
  const { onNotification, enabled = false } = options;
  return useRealtimeRelayStream<VitanaNotification>({
    path: 'user-notifications/stream',
    eventName: 'user_notification',
    onRow: onNotification,
    enabled,
    debugLabel: 'user-notifications',
  });
}
