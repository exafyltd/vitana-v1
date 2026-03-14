import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE;

export interface ChatMessage {
  id: string;
  tenant_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  peer_id: string;
  last_message: ChatMessage;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No active session");
  return {
    "Authorization": `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chat API ${res.status}: ${body}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

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

export async function fetchConversations(): Promise<ChatConversation[]> {
  return apiFetch<ChatConversation[]>("/api/v1/chat/conversations");
}

export async function fetchConversation(
  peerId: string,
  limit = 50,
  before?: string
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  return apiFetch<ChatMessage[]>(`/api/v1/chat/conversation/${peerId}?${params}`);
}

export async function sendChatMessage(
  receiverId: string,
  content: string
): Promise<ChatMessage> {
  return apiFetch<ChatMessage>("/api/v1/chat/send", {
    method: "POST",
    body: JSON.stringify({ receiver_id: receiverId, content }),
  });
}

export async function markChatRead(peerId: string): Promise<void> {
  await apiFetch("/api/v1/chat/read", {
    method: "POST",
    body: JSON.stringify({ peer_id: peerId }),
  });
}

export async function fetchUnreadCount(): Promise<number> {
  if (!GATEWAY_BASE) {
    return fetchUnreadCountFromSupabase();
  }

  try {
    const res = await apiFetch<{ count: number }>("/api/v1/chat/unread-count");
    return typeof res === "number" ? res : (res as any).count ?? (res as any);
  } catch (error) {
    console.warn("[useChatApi] Gateway unread count failed, falling back to Supabase:", error);
    return fetchUnreadCountFromSupabase();
  }
}

