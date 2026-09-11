/**
 * Frontend consumer for the gateway's B5 realtime relay
 * (`GET /api/v1/realtime/user-activity-log/stream` in vitana-platform's
 * `services/gateway/src/routes/realtime-relay.ts`). Thin wrapper over the
 * shared `useRealtimeRelayStream` — see that file's doc comment for why
 * this hook isn't wired into any component yet.
 *
 * `UserActivityLogRow` is deliberately loose (no fixed column list beyond
 * `id`/`user_id`/`created_at`) — the existing `useActivityHistory.ts`
 * hook that reads this same table today doesn't type its realtime payload
 * either (its `postgres_changes` callback just invalidates a query and
 * refetches via a separate REST call). Tightening this type is a real
 * improvement to make once a caller actually needs specific fields, not
 * invented ahead of that need.
 */

import { useRealtimeRelayStream, type RelayConnectionStatus } from './useRealtimeRelayStream';

export type { RelayConnectionStatus };

export interface UserActivityLogRow {
  id: string;
  user_id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface UseUserActivityLogRealtimeRelayOptions {
  /** Called once per activity-log row as it arrives. Does not manage any list state itself — the caller decides how to merge it. */
  onRow: (row: UserActivityLogRow) => void;
  /** Off by default so importing this hook has zero effect until a caller opts in explicitly. */
  enabled?: boolean;
}

export function useUserActivityLogRealtimeRelay(options: UseUserActivityLogRealtimeRelayOptions): RelayConnectionStatus {
  const { onRow, enabled = false } = options;
  return useRealtimeRelayStream<UserActivityLogRow>({
    path: 'user-activity-log/stream',
    eventName: 'user_activity',
    onRow,
    enabled,
    debugLabel: 'user-activity-log',
  });
}
