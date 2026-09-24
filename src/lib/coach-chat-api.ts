/**
 * VTID-04448: the Health Coach chat talks to the gateway's conversation API.
 *
 * It used to call the `ai-chat` Supabase edge function, which answered on
 * Gemini, searched memory through the Gemini `search-memories` function and
 * wrote its own insights into the legacy `ai_memory` table. None of that is
 * the memory Vitana recalls elsewhere, and GCP is off.
 *
 * `POST /api/v1/conversation/turn` reads the canonical memory store through
 * the memory orchestrator, answers in the user's language, and binds the
 * turn to the signed-in user (VTID-04447). The ids sent here are the caller's
 * own; the gateway refuses anything else.
 */
import { supabase } from "@/integrations/supabase/client";
import { communityFetch } from "@/lib/community-gateway";

const THREAD_KEY = "vitana.healthCoach.threadId";

export interface CoachReply {
  reply: string;
  threadId: string;
}

function readThreadId(): string | undefined {
  try {
    return sessionStorage.getItem(THREAD_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeThreadId(id: string): void {
  try {
    sessionStorage.setItem(THREAD_KEY, id);
  } catch {
    /* storage unavailable: the next message starts a new thread */
  }
}

export async function sendCoachMessage(text: string, lang: string): Promise<CoachReply> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Not authenticated");
  const tenantId = (user.app_metadata as Record<string, unknown> | undefined)?.active_tenant_id;

  const threadId = readThreadId();
  const body: Record<string, unknown> = {
    channel: "orb",
    user_id: user.id,
    lang: lang.slice(0, 2),
    message: { type: "text", text },
    ui_context: { surface: "orb", screen: "health_coach" },
  };
  if (typeof tenantId === "string" && tenantId) body.tenant_id = tenantId;
  if (threadId) body.thread_id = threadId;

  const resp = await communityFetch("/api/v1/conversation/turn", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.ok === false || typeof json?.reply !== "string") {
    throw new Error(json?.error || `HTTP ${resp.status}`);
  }
  if (typeof json.thread_id === "string" && json.thread_id) writeThreadId(json.thread_id);
  return { reply: json.reply, threadId: json.thread_id };
}
