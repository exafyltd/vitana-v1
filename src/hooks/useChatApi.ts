import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE =
  (import.meta as any).env?.VITE_GATEWAY_URL || "/api/v1";

export interface ChatMessage {
  id: string;
  tenant_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  message_type?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatConversation {
  peer_id: string;
  last_message: ChatMessage;
}

async function gatewayFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_BASE}/chat${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Gateway ${res.status}`);
  }
  return res.json();
}

export async function fetchConversations(): Promise<ChatConversation[]> {
  const json = await gatewayFetch("/conversations");
  return json.data || [];
}

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

export async function markChatRead(peerId: string): Promise<void> {
  await gatewayFetch("/read", {
    method: "POST",
    body: JSON.stringify({ peer_id: peerId }),
  });
}

// --- Unread count (retained for useChatUnreadCount consumer) ---

async function fetchUnreadCountFromSupabase(): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const json = await gatewayFetch("/unread-count");
    const res = json.data ?? json;
    return typeof res === "number" ? res : (res as any).count ?? 0;
  } catch (error) {
    console.warn("[useChatApi] Gateway unread count failed, falling back to Supabase:", error);
    return fetchUnreadCountFromSupabase();
  }
}
