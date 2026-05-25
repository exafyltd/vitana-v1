/**
 * VTID-02601 — Reminders REST client.
 * Wraps communityFetch (Bearer JWT) for the gateway /api/v1/reminders surface.
 */

import { communityFetch, COMMUNITY_GATEWAY } from "./community-gateway";

export interface ReminderRow {
  id: string;
  user_id: string;
  tenant_id: string;
  action_text: string;
  spoken_message: string;
  description: string | null;
  next_fire_at: string;
  user_tz: string;
  status: "pending" | "dispatching" | "fired" | "completed" | "failed" | "cancelled";
  delivery_via: string | null;
  fired_at: string | null;
  acked_at: string | null;
  snooze_count: number;
  tts_audio_b64: string | null;
  tts_voice: string | null;
  tts_lang: string | null;
  calendar_event_id: string | null;
  created_via: "voice" | "ui" | "system";
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  action_text: string;
  spoken_message?: string; // defaults to action_text
  scheduled_for_iso: string;
  description?: string;
  user_tz?: string;
  lang?: string;
  calendar_event_id?: string | null;
}

function userTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function userLang(): string {
  return (navigator?.language || "en").slice(0, 5);
}

export async function listReminders(opts?: {
  include_fired?: boolean;
  q?: string;
  limit?: number;
}): Promise<ReminderRow[]> {
  const params = new URLSearchParams();
  if (opts?.include_fired) params.set("include_fired", "1");
  if (opts?.q) params.set("q", opts.q);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const r = await communityFetch(`/api/v1/reminders${params.toString() ? `?${params}` : ""}`);
  if (!r.ok) throw new Error(`listReminders ${r.status}`);
  const j = await r.json();
  return (j?.data || []) as ReminderRow[];
}

export async function getMissedReminders(): Promise<ReminderRow[]> {
  const r = await communityFetch("/api/v1/reminders/missed");
  if (!r.ok) throw new Error(`getMissedReminders ${r.status}`);
  const j = await r.json();
  return (j?.data || []) as ReminderRow[];
}

/** Fetch a single reminder by id (used by the push-click deep-link overlay). */
export async function getReminderById(id: string): Promise<ReminderRow | null> {
  const r = await communityFetch(`/api/v1/reminders/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getReminderById ${r.status}`);
  const j = await r.json();
  return (j?.data || null) as ReminderRow | null;
}

export async function createReminder(input: CreateReminderInput): Promise<ReminderRow> {
  const body = {
    user_tz: userTz(),
    lang: userLang(),
    spoken_message: input.spoken_message || input.action_text,
    ...input,
  };
  const r = await communityFetch("/api/v1/reminders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`createReminder ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data as ReminderRow;
}

export async function updateReminder(
  id: string,
  patch: Partial<CreateReminderInput>,
): Promise<ReminderRow> {
  const r = await communityFetch(`/api/v1/reminders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`updateReminder ${r.status}`);
  const j = await r.json();
  return j.data as ReminderRow;
}

export async function snoozeReminder(id: string, minutes = 10): Promise<ReminderRow> {
  const r = await communityFetch(`/api/v1/reminders/${id}/snooze`, {
    method: "POST",
    body: JSON.stringify({ minutes }),
  });
  if (!r.ok) throw new Error(`snoozeReminder ${r.status}`);
  const j = await r.json();
  return j.data as ReminderRow;
}

export async function ackReminder(
  id: string,
  via: "sse" | "fcm" | "manual" | "manual_replay" = "manual",
): Promise<void> {
  await communityFetch(`/api/v1/reminders/${id}/ack`, {
    method: "POST",
    body: JSON.stringify({ via }),
  });
}

export async function completeReminder(id: string): Promise<ReminderRow> {
  const r = await communityFetch(`/api/v1/reminders/${id}/complete`, {
    method: "POST",
  });
  if (!r.ok) throw new Error(`completeReminder ${r.status}`);
  const j = await r.json();
  return j.data as ReminderRow;
}

export async function deleteReminder(id: string): Promise<void> {
  const r = await communityFetch(`/api/v1/reminders/${id}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`deleteReminder ${r.status}`);
}

export async function deleteAllReminders(): Promise<{ deleted: number }> {
  const r = await communityFetch(`/api/v1/reminders?mode=all`, { method: "DELETE" });
  if (!r.ok) throw new Error(`deleteAllReminders ${r.status}`);
  const j = await r.json();
  return { deleted: j.deleted || 0 };
}

/**
 * Build the SSE stream URL for the current user. EventSource cannot send
 * Authorization headers, so we pass user_id via query string. Server-side
 * still validates against the gateway-resolved JWT path; this query param
 * is the address for the SSE poll.
 */
export function reminderStreamUrl(userId: string): string {
  return `${COMMUNITY_GATEWAY}/api/v1/reminders/stream?user_id=${encodeURIComponent(userId)}`;
}
