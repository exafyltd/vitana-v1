/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the gateway chat
 * calls the inbox list makes. Native twin of the list-side functions of the
 * web `src/hooks/useChatApi.ts` (`fetchConversations`, `fetchUnreadCount`,
 * `markAllChatRead`, `fetchGroups`, `markGroupRead`): that module imports the
 * web Supabase client (class B), so it is re-implemented here, never moved
 * into `@vitana/core` (plan decision 2, sparring R1-F2).
 *
 * `getGateway()` (N1 `createGatewayFetch`) adds the Bearer token and the
 * `/api/v1` prefix; like the web `gatewayFetch` every call sends
 * `Content-Type: application/json`, and a non-2xx answer throws with the
 * gateway's `error` (or `Gateway <status>`).
 */
import { getGateway } from '../../../auth/gateway';

async function chatFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await getGateway()(`/chat${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...((init.headers as Record<string, string> | undefined) ?? {}) },
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `Gateway ${res.status}`);
  return body as T;
}

/** A gateway DM row (web `ChatMessage`, the fields the list reads). */
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at?: string | null;
  created_at: string;
  message_type?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatConversation {
  peer_id: string;
  last_message: ChatMessage | null;
}

/** A chat group (web `ChatGroup`, the fields the list reads). */
export interface ChatGroup {
  id: string;
  name: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  last_message?: { id?: string; sender_id?: string; content?: string; created_at?: string } | null;
  unread_count?: number;
}

/** GET /chat/conversations — latest message per peer. */
export async function fetchConversations(): Promise<ChatConversation[]> {
  const json = await chatFetch<{ data?: ChatConversation[] }>('/conversations');
  return json.data || [];
}

/** GET /chat/unread-count — direct unread total. */
export async function fetchUnreadCount(): Promise<number> {
  const json = await chatFetch<{ count?: number }>('/unread-count');
  return json.count || 0;
}

/** POST /chat/read-all — marks every direct message read. */
export async function markAllChatRead(): Promise<number> {
  const json = await chatFetch<{ updated?: number }>('/read-all', { method: 'POST', body: JSON.stringify({}) });
  return json.updated ?? 0;
}

/** GET /chat/groups/ — the member's chat groups with last message + unread. */
export async function fetchGroups(): Promise<ChatGroup[]> {
  const json = await chatFetch<{ data?: ChatGroup[] }>('/groups/');
  return json.data || [];
}

/** POST /chat/groups/:id/read. */
export async function markGroupRead(groupId: string): Promise<void> {
  await chatFetch(`/groups/${groupId}/read`, { method: 'POST' });
}
