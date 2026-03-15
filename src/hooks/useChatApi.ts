/**
 * Chat API client — gateway fetch/send functions for direct messaging.
 *
 * Types extended with message_type + metadata to support voice transcript
 * messages from the Vitana DM bridge (VTID-CHAT-BRIDGE).
 *
 * Auth: Bearer token from Supabase session (gateway validates JWT).
 */

import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE = "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1";

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
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
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
    credentials: "include",
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
  content: string
): Promise<ChatMessage> {
  const json = await gatewayFetch("/send", {
    method: "POST",
    body: JSON.stringify({ receiver_id: receiverId, content }),
  });
  return json.data;
}

/** Mark all messages from a peer as read. */
export async function markChatRead(peerId: string): Promise<void> {
  await gatewayFetch("/read", {
    method: "POST",
    body: JSON.stringify({ peer_id: peerId }),
  });
}

/** Get total unread message count from gateway. */
export async function fetchUnreadCount(): Promise<number> {
  const json = await gatewayFetch("/unread-count");
  return json.count || 0;
}
