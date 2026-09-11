/**
 * Frontend consumer for the gateway's B5 realtime relay
 * (`GET /api/v1/realtime/chat-messages/stream` in vitana-platform's
 * `services/gateway/src/routes/realtime-relay.ts`). Thin wrapper over the
 * shared `useRealtimeRelayStream` — see that file's doc comment for why
 * this hook isn't wired into any component yet.
 *
 * Reuses `ChatMessage` from `useChatApi.ts` rather than inventing a new
 * shape — the relay's `chat_message` event carries the same
 * `chat_messages` row that hook's own REST fetch already returns.
 */

import { useRealtimeRelayStream, type RelayConnectionStatus } from './useRealtimeRelayStream';
import type { ChatMessage } from './useChatApi';

export type { RelayConnectionStatus };

export interface UseChatMessagesRealtimeRelayOptions {
  /** Called once per chat message as it arrives (DM or group — the relay's own authorization already scoped this to messages the caller can see). Does not manage any list state itself — the caller decides how to merge it. */
  onMessage: (message: ChatMessage) => void;
  /** Off by default so importing this hook has zero effect until a caller opts in explicitly. */
  enabled?: boolean;
}

export function useChatMessagesRealtimeRelay(options: UseChatMessagesRealtimeRelayOptions): RelayConnectionStatus {
  const { onMessage, enabled = false } = options;
  return useRealtimeRelayStream<ChatMessage>({
    path: 'chat-messages/stream',
    eventName: 'chat_message',
    onRow: onMessage,
    enabled,
    debugLabel: 'chat-messages',
  });
}
