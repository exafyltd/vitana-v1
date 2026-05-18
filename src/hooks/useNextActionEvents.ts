/**
 * VTID-03072 (B0d-real frontend ACT/DISMISS hooks).
 *
 * Frontend bridge to the gateway's continuation lifecycle endpoint.
 * When Vitana offers a next action (B0d-real composer pick rendered as
 * the wake-brief OR the turn-end continuation), the user can ACCEPT
 * (followed the CTA) or DISMISS (said no / ignored). Both events POST to:
 *
 *   POST /api/v1/voice/next-action/event
 *
 * Body shape (matches voice-next-action-event.ts on the gateway):
 *   {
 *     decisionId: string,            // from wake_brief_decision.decision_id
 *     dedupeKey: string,             // from the chosen candidate's dedupe_key
 *     eventName: 'accepted' | 'dismissed',
 *     source?: string,               // candidate source key, e.g. 'reminder_due'
 *     surface?: 'orb_wake' | 'orb_turn_end' | 'text_turn_end' | 'home',
 *     occurredAt?: string,           // ISO 8601, optional — server fills if absent
 *     metadata?: Record<string, unknown>   // freeform context, capped at 16 keys server-side
 *   }
 *
 * The hook stays thin: callers own the decisionId + dedupeKey resolution
 * (those come from wake_brief_decision on the bootstrap response). This
 * keeps the hook composable with any UI surface — wake-brief banner,
 * turn-end follow-up button, home DYK card — without each adding its own
 * fetch boilerplate or auth handling.
 *
 * Auth: Bearer JWT from supabase.auth.getSession(); endpoint rejects
 * anonymous calls with 401 (gateway middleware `requireAuthWithTenant`).
 *
 * Fire-and-forget at the UI level: callers can `await` if they need to
 * disable a button while in-flight, but the gateway emits OASIS
 * (suggested → accepted | dismissed) immediately and the response
 * carries the topic + ids so the caller can correlate locally.
 */

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || "";

export type NextActionSurface =
  | "orb_wake"
  | "orb_turn_end"
  | "text_turn_end"
  | "home";

export type NextActionEventName = "accepted" | "dismissed";

export interface NextActionEventInput {
  decisionId: string;
  dedupeKey: string;
  source?: string;
  surface?: NextActionSurface;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NextActionEventResponse {
  ok: boolean;
  vtid?: string;
  decision_id?: string;
  dedupe_key?: string;
  event_name?: NextActionEventName;
  topic?: string;
  error?: string;
  message?: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function postNextActionEvent(
  input: NextActionEventInput,
  eventName: NextActionEventName,
): Promise<NextActionEventResponse> {
  if (!input.decisionId) throw new Error("decisionId is required");
  if (!input.dedupeKey) throw new Error("dedupeKey is required");

  const headers = await authHeaders();
  const body: Record<string, unknown> = {
    decisionId: input.decisionId,
    dedupeKey: input.dedupeKey,
    eventName,
  };
  if (input.source) body.source = input.source;
  if (input.surface) body.surface = input.surface;
  if (input.occurredAt) body.occurredAt = input.occurredAt;
  if (input.metadata) body.metadata = input.metadata;

  const res = await fetch(`${GATEWAY_BASE}/api/v1/voice/next-action/event`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as NextActionEventResponse;
  if (!res.ok || json.ok === false) {
    const detail = json.error || json.message || `status_${res.status}`;
    throw new Error(`next_action_event_failed:${eventName}:${detail}`);
  }
  return json;
}

/**
 * React hook exposing accept + dismiss mutations for a B0d-real
 * next-action candidate. Caller passes the decisionId + dedupeKey from
 * the bootstrap response (LiveKit `wake_brief_decision` or the legacy
 * Vertex `meta.wake_brief`).
 *
 * Usage:
 *   const { accept, dismiss, isPending } = useNextActionEvents();
 *   await accept.mutateAsync({
 *     decisionId,
 *     dedupeKey,
 *     source: 'reminder_due',
 *     surface: 'orb_wake',
 *   });
 */
export function useNextActionEvents() {
  const accept = useMutation<NextActionEventResponse, Error, NextActionEventInput>({
    mutationFn: (input) => postNextActionEvent(input, "accepted"),
  });
  const dismiss = useMutation<NextActionEventResponse, Error, NextActionEventInput>({
    mutationFn: (input) => postNextActionEvent(input, "dismissed"),
  });
  return {
    accept,
    dismiss,
    isPending: accept.isPending || dismiss.isPending,
  };
}

// Pure exports for tests / non-hook call sites (e.g. an event listener
// reacting to a tool-call from the agent). Same auth headers, same
// validation, same body shape — bypasses React Query so non-component
// code can fire them.
export async function acceptNextActionEvent(
  input: NextActionEventInput,
): Promise<NextActionEventResponse> {
  return postNextActionEvent(input, "accepted");
}

export async function dismissNextActionEvent(
  input: NextActionEventInput,
): Promise<NextActionEventResponse> {
  return postNextActionEvent(input, "dismissed");
}
