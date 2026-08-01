/**
 * Chat API client — gateway fetch/send functions for direct messaging.
 *
 * Types extended with message_type + metadata to support voice transcript
 * messages from the Vitana DM bridge (VTID-CHAT-BRIDGE).
 *
 * Auth: Bearer token from Supabase session (gateway validates JWT).
 */

import { supabase } from "@/integrations/supabase/client";

// Honor VITE_GATEWAY_URL (already includes "/api/v1") so the staging frontend
// exercises the staging gateway code (VTID-03292) instead of always hitting
// prod. Falls back to the prod gateway for builds without the env var.
const GATEWAY_BASE =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

// ── Types ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  tenant_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  /** Message kind: 'text' (DM default) or 'voice_transcript' (ORB voice) */
  message_type?: string;
  /** Structured metadata: orb_session_id, turn_index, model_used, etc. */
  metadata?: Record<string, unknown>;
}

export interface ChatConversation {
  peer_id: string;
  last_message: ChatMessage;
}

// ── Helpers ───────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  let { data } = await supabase.auth.getSession();
  let token = data?.session?.access_token;

  // If no token, try refreshing the session once before giving up
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token;
  }

  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function gatewayFetch(path: string, init?: RequestInit) {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${GATEWAY_BASE}/chat${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Gateway ${res.status}`);
  }

  return res.json();
}

// ── API Functions ─────────────────────────────────────────────────────

/** List recent conversations (latest message per peer). */
export async function fetchConversations(): Promise<ChatConversation[]> {
  const json = await gatewayFetch("/conversations");
  return json.data || [];
}

/** Get paginated messages between current user and a peer. */
export async function fetchConversation(
  peerId: string,
  limit = 50,
  before?: string
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  const json = await gatewayFetch(`/conversation/${peerId}?${params}`);
  return json.data || [];
}

/** Send a direct message. Returns the created message. */
export async function sendChatMessage(
  receiverId: string,
  content: string,
  options?: { messageType?: string; contentData?: any }
): Promise<ChatMessage> {
  const body: Record<string, unknown> = { receiver_id: receiverId, content };
  if (options?.messageType) body.message_type = options.messageType;
  if (options?.contentData !== undefined) body.content_data = options.contentData;
  const json = await gatewayFetch("/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json.data;
}

/**
 * Ask Vitana to generate + write her reply to the last message sent to her,
 * and wait for it (VTID-03470). Call this right after a successful
 * sendChatMessage() to the Vitana bot — the reply used to be generated
 * fire-and-forget as a side effect of /send itself, which could silently
 * lose the reply under the gateway's serverless CPU throttling. This is a
 * separate, explicitly-awaited call so completion is deterministic; the
 * reply still lands in chat_messages and is picked up by the existing
 * Realtime subscription like any other message, so no rendering change is
 * needed beyond calling this after send. Errors are non-fatal to the send
 * itself — the user's message already went through — so callers should
 * catch and log/toast rather than treat this as blocking.
 */
export async function requestVitanaReply(content: string): Promise<string | null> {
  const json = await gatewayFetch("/vitana-reply", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return json.reply ?? null;
}

/** Mark all messages from a peer as read. */
export async function markChatRead(peerId: string): Promise<void> {
  await gatewayFetch("/read", {
    method: "POST",
    body: JSON.stringify({ peer_id: peerId }),
  });
}

/** Mark ALL of the caller's unread direct messages as read. Returns the number updated. */
export async function markAllChatRead(): Promise<number> {
  const json = await gatewayFetch("/read-all", {
    method: "POST",
    body: JSON.stringify({}),
  });
  return json.updated ?? 0;
}

/** Get total unread message count from gateway. */
export async function fetchUnreadCount(): Promise<number> {
  const json = await gatewayFetch("/unread-count");
  return json.count || 0;
}

// ── Group chat (VTID-03089) ────────────────────────────────────────────

export interface ChatGroup {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  role?: string;
  joined_at?: string;
  last_read_at?: string | null;
  last_message?: ChatGroupMessage | null;
  unread_count?: number;
}

export interface ChatGroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string | null;
  avatar_url: string | null;
  is_bot: boolean;
}

export interface ChatGroupMessage {
  id: string;
  tenant_id: string;
  sender_id: string;
  group_id: string;
  content: string;
  created_at: string;
  message_type?: string;
  metadata?: Record<string, unknown>;
}

async function gatewayGroupFetch(path: string, init?: RequestInit) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${GATEWAY_BASE}/chat/groups${path}`, {
    ...init,
    headers: { ...authHeaders, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Gateway ${res.status}`);
  }
  return res.json();
}

export async function fetchGroups(): Promise<ChatGroup[]> {
  const json = await gatewayGroupFetch("/");
  return json.data || [];
}

export async function fetchGroup(
  groupId: string,
): Promise<ChatGroup & { members: ChatGroupMember[]; member_count: number }> {
  const json = await gatewayGroupFetch(`/${groupId}`);
  return json.data;
}

export async function fetchGroupMessages(
  groupId: string,
  limit = 50,
  before?: string,
): Promise<ChatGroupMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  const json = await gatewayGroupFetch(`/${groupId}/messages?${params}`);
  return json.data || [];
}

export interface SendGroupMessageOptions {
  messageType?: string;
  contentData?: Record<string, unknown> | null;
}

export async function sendGroupMessage(
  groupId: string,
  content: string,
  opts?: SendGroupMessageOptions,
): Promise<ChatGroupMessage> {
  const body: Record<string, unknown> = { content };
  if (opts?.messageType && opts.messageType !== "text") body.message_type = opts.messageType;
  if (opts?.contentData) body.content_data = opts.contentData;
  const json = await gatewayGroupFetch(`/${groupId}/send`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json.data;
}

export async function markGroupRead(groupId: string): Promise<void> {
  await gatewayGroupFetch(`/${groupId}/read`, { method: "POST" });
}

/** Edit a group message the caller sent. Returns the updated message. */
export async function updateGroupMessage(
  groupId: string,
  messageId: string,
  content: string,
): Promise<ChatGroupMessage> {
  const json = await gatewayGroupFetch(`/${groupId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
  return json.data;
}

/** Delete a group message the caller sent. */
export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  await gatewayGroupFetch(`/${groupId}/messages/${messageId}`, { method: "DELETE" });
}
