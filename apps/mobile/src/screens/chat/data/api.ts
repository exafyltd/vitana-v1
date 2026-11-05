/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — native
 * twin of the web chat gateway client `src/hooks/useChatApi.ts` (direct
 * messages `/api/v1/chat/*`, group chat `/api/v1/chat/groups/*`). The web
 * module runtime-imports the Supabase client (class B), so it is
 * re-implemented here over `getGateway()` (N1's `createGatewayFetch`: Bearer
 * token + `/api/v1` prefix), with the same paths, query parameters, bodies
 * and error rule (`body.error || "Gateway <status>"`).
 */
import { getGateway } from '../../../auth/gateway';

export interface ChatMessage {
  id: string;
  tenant_id?: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  read_at?: string | null;
  created_at: string;
  message_type?: string;
  metadata?: Record<string, unknown>;
  delivered_at?: string | null;
  client_message_id?: string | null;
  reply_to_message_id?: string | null;
  duplicate?: boolean;
}

export interface MessageWindow<T> {
  data: T[];
  has_older: boolean;
  has_newer: boolean;
}

export interface ChatGroup {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export interface ChatGroupMember {
  user_id: string;
  role: string;
  joined_at?: string;
  display_name: string | null;
  avatar_url: string | null;
  is_bot?: boolean;
  mentionable?: boolean;
}

export interface ChatGroupMessage {
  id: string;
  tenant_id?: string;
  sender_id: string;
  group_id?: string;
  content: string;
  created_at: string;
  message_type?: string;
  metadata?: Record<string, unknown>;
  client_message_id?: string | null;
  reply_to_message_id?: string | null;
  duplicate?: boolean;
}

export type GroupWithMembers = ChatGroup & { members: ChatGroupMember[]; member_count: number };

/** web `gatewayFetch` / `gatewayGroupFetch`: JSON in and out, a non-2xx answer throws. */
export async function chatGatewayFetch<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
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

type DataBody<T> = { data?: T; has_older?: boolean; has_newer?: boolean; duplicate?: boolean; reply?: string | null };

// ── Direct messages ──────────────────────────────────────────────────────

export async function fetchConversation(peerId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  const json = await chatGatewayFetch<DataBody<ChatMessage[]>>(`/conversation/${peerId}?${params.toString()}`);
  return json.data || [];
}

/** A window of a DM around one message; 404 / message_not_found → null. */
export async function fetchConversationAround(peerId: string, messageId: string, limit = 40): Promise<MessageWindow<ChatMessage> | null> {
  const params = new URLSearchParams({ limit: String(limit), around: messageId });
  try {
    const json = await chatGatewayFetch<DataBody<ChatMessage[]>>(`/conversation/${peerId}?${params.toString()}`);
    return { data: json.data || [], has_older: !!json.has_older, has_newer: !!json.has_newer };
  } catch (err) {
    if (err instanceof Error && /message_not_found|Gateway 404/.test(err.message)) return null;
    throw err;
  }
}

export async function sendChatMessage(
  receiverId: string,
  content: string,
  options?: { messageType?: string; contentData?: unknown; clientMessageId?: string; replyToMessageId?: string | null },
): Promise<ChatMessage> {
  const body: Record<string, unknown> = { receiver_id: receiverId, content };
  if (options?.messageType) body.message_type = options.messageType;
  if (options?.contentData !== undefined) body.content_data = options.contentData;
  if (options?.clientMessageId) body.client_message_id = options.clientMessageId;
  if (options?.replyToMessageId) body.reply_to_message_id = options.replyToMessageId;
  const json = await chatGatewayFetch<DataBody<ChatMessage>>('/send', { method: 'POST', body: JSON.stringify(body) });
  return (json.duplicate ? { ...(json.data as ChatMessage), duplicate: true } : json.data) as ChatMessage;
}

/** Ask Vitana to write her reply to the last message sent to her (web VTID-03470). */
export async function requestVitanaReply(content: string): Promise<string | null> {
  const json = await chatGatewayFetch<DataBody<never>>('/vitana-reply', { method: 'POST', body: JSON.stringify({ content }) });
  return json.reply ?? null;
}

export async function markChatRead(peerId: string): Promise<void> {
  await chatGatewayFetch('/read', { method: 'POST', body: JSON.stringify({ peer_id: peerId }) });
}

// ── Group chat (chat_groups, web VTID-03089) ─────────────────────────────

export async function fetchGroup(groupId: string): Promise<GroupWithMembers> {
  const json = await chatGatewayFetch<DataBody<GroupWithMembers>>(`/groups/${groupId}`);
  return json.data as GroupWithMembers;
}

export async function fetchGroupMessages(groupId: string, limit = 50, before?: string): Promise<ChatGroupMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  const json = await chatGatewayFetch<DataBody<ChatGroupMessage[]>>(`/groups/${groupId}/messages?${params.toString()}`);
  return json.data || [];
}

export async function fetchGroupMessagesAround(groupId: string, messageId: string, limit = 40): Promise<MessageWindow<ChatGroupMessage> | null> {
  const params = new URLSearchParams({ limit: String(limit), around: messageId });
  try {
    const json = await chatGatewayFetch<DataBody<ChatGroupMessage[]>>(`/groups/${groupId}/messages?${params.toString()}`);
    return { data: json.data || [], has_older: !!json.has_older, has_newer: !!json.has_newer };
  } catch (err) {
    if (err instanceof Error && /message_not_found|Gateway 404/.test(err.message)) return null;
    throw err;
  }
}

export async function sendGroupMessage(
  groupId: string,
  content: string,
  opts?: { messageType?: string; contentData?: Record<string, unknown> | null; clientMessageId?: string; replyToMessageId?: string | null },
): Promise<ChatGroupMessage> {
  const body: Record<string, unknown> = { content };
  if (opts?.messageType && opts.messageType !== 'text') body.message_type = opts.messageType;
  if (opts?.contentData) body.content_data = opts.contentData;
  if (opts?.clientMessageId) body.client_message_id = opts.clientMessageId;
  if (opts?.replyToMessageId) body.reply_to_message_id = opts.replyToMessageId;
  const json = await chatGatewayFetch<DataBody<ChatGroupMessage>>(`/groups/${groupId}/send`, { method: 'POST', body: JSON.stringify(body) });
  return (json.duplicate ? { ...(json.data as ChatGroupMessage), duplicate: true } : json.data) as ChatGroupMessage;
}

export async function markGroupRead(groupId: string): Promise<void> {
  await chatGatewayFetch(`/groups/${groupId}/read`, { method: 'POST' });
}

export async function updateGroupMessage(groupId: string, messageId: string, content: string): Promise<ChatGroupMessage> {
  const json = await chatGatewayFetch<DataBody<ChatGroupMessage>>(`/groups/${groupId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return json.data as ChatGroupMessage;
}

export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  await chatGatewayFetch(`/groups/${groupId}/messages/${messageId}`, { method: 'DELETE' });
}

// ── Lists + receipts (forward targets, VTID-05138; delivery, VTID-05320) ──

export interface ChatConversation {
  peer_id: string;
  last_message: ChatMessage;
}

/** The member's DMs (web `fetchConversations`, `/chat/conversations`). */
export async function fetchConversations(): Promise<ChatConversation[]> {
  const json = await chatGatewayFetch<DataBody<ChatConversation[]>>('/conversations');
  return json.data || [];
}

/** The member's groups (web `fetchGroups`, `/chat/groups/`). */
export async function fetchGroups(): Promise<ChatGroup[]> {
  const json = await chatGatewayFetch<DataBody<ChatGroup[]>>('/groups/');
  return json.data || [];
}

/** Received DMs that reached this device (≤ 200 ids, web `markMessagesDelivered`). */
export async function markMessagesDelivered(messageIds: string[]): Promise<number> {
  if (messageIds.length === 0) return 0;
  const json = await chatGatewayFetch<{ updated?: number }>('/delivered', { method: 'POST', body: JSON.stringify({ message_ids: messageIds.slice(0, 200) }) });
  return Number(json.updated) || 0;
}
