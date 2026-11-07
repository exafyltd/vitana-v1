/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the row
 * and thread shapes the native chat screens render. Same fields as the web
 * `GlobalMessage` / `GlobalMessageThread` (src/hooks/useGlobalMessages.ts:143-188)
 * and GroupChat's `BubbleMessage` (src/pages/messages/GroupChat.tsx:79-93).
 *
 * The Vitana bot identity is mirrored from src/lib/vitanaBotIdentity.ts (that
 * module reads `import.meta.env`, class B, so it cannot enter @vitana/core);
 * the native app has no VITE_VITANA_BOT_USER_ID, so the id is the web default.
 */
export const VITANA_BOT_USER_ID = '00000000-0000-0000-0000-000000000001';
export const VITANA_BOT_DISPLAY_NAME = 'Vitana';

export function isVitanaBot(userId: string | null | undefined): boolean {
  return !!userId && userId === VITANA_BOT_USER_ID;
}

export interface MessageSender {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface ChatViewMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  content_data?: Record<string, unknown> | null;
  created_at: string;
  read_at?: string | null;
  delivered_at?: string | null;
  client_message_id?: string | null;
  reply_to_message_id?: string | null;
  parent_message_id?: string | null;
  /** Card buttons (payment / calendar / booking, tenant `messages.action_buttons`). */
  action_buttons?: unknown[] | null;
  /** Only on local (outbox) rows: the send is in flight or failed. */
  send_status?: 'sending' | 'failed';
  sender?: MessageSender | null;
}

export interface ThreadParticipant {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  last_read_at?: string | null;
}

/**
 * A conversation as the DM screen opens it. `id` is the web thread id: the
 * peer's user id for a direct chat (gateway threads, useGlobalMessages.ts:775),
 * the `global_message_threads.id` for a legacy group thread.
 */
export interface ConversationThread {
  id: string;
  type: 'direct' | 'group';
  name?: string | null;
  created_by?: string | null;
  participants: ThreadParticipant[];
  /** The legacy `global_message_threads.id` behind a thread (messages fallback). */
  legacyThreadId?: string | null;
}

export const TEMP_PREFIX = 'temp-';

export function tempIdFor(clientMessageId: string): string {
  return `${TEMP_PREFIX}${clientMessageId}`;
}
