/**
 * VTID-05530 — native twin of the web reminders client (`src/lib/reminders-api.ts`): the same
 * `/api/v1/reminders` paths and bodies through the app's gateway fetch. The live fire stream
 * (SSE chime and voice) is not part of this port: a reminder opens from its push link
 * (`/reminders/fire/:fireId`), exactly the web's deep-link path.
 */
import { getGateway } from '../../../auth/gateway';
import { deviceTimeZone } from '../format';

export interface ReminderRow {
  id: string;
  user_id: string;
  tenant_id: string;
  action_text: string;
  spoken_message: string;
  description: string | null;
  next_fire_at: string;
  user_tz: string;
  status: 'pending' | 'dispatching' | 'fired' | 'completed' | 'failed' | 'cancelled';
  delivery_via: string | null;
  fired_at: string | null;
  acked_at: string | null;
  snooze_count: number;
  tts_audio_b64: string | null;
  tts_voice: string | null;
  tts_lang: string | null;
  calendar_event_id: string | null;
  created_via: 'voice' | 'ui' | 'system';
  created_at: string;
  updated_at: string;
}

export interface CreateReminderInput {
  action_text: string;
  spoken_message?: string;
  scheduled_for_iso: string;
  description?: string;
  user_tz?: string;
  lang?: string;
  calendar_event_id?: string | null;
}

export class RemindersApiError extends Error {
  readonly status: number;
  constructor(op: string, status: number) {
    super(`${op} ${status}`);
    this.name = 'RemindersApiError';
    this.status = status;
  }
}

async function call(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: <T = Record<string, unknown>>() => Promise<T> }> {
  const res = await getGateway()(path, { ...init, headers: { 'Content-Type': 'application/json', ...((init?.headers as Record<string, string> | undefined) ?? {}) } });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    json: async <T,>() => {
      try {
        return (text ? JSON.parse(text) : {}) as T;
      } catch {
        return {} as T;
      }
    },
  };
}

export async function listReminders(opts?: { include_fired?: boolean; q?: string; limit?: number }): Promise<ReminderRow[]> {
  const params = new URLSearchParams();
  if (opts?.include_fired) params.set('include_fired', '1');
  if (opts?.q) params.set('q', opts.q);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const r = await call(`/api/v1/reminders${params.toString() ? `?${params}` : ''}`);
  if (!r.ok) throw new RemindersApiError('listReminders', r.status);
  const j = await r.json<{ data?: ReminderRow[] }>();
  return j.data ?? [];
}

/** One reminder by id (the push-link deep link). `null` when it no longer exists. */
export async function getReminderById(id: string): Promise<ReminderRow | null> {
  const r = await call(`/api/v1/reminders/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new RemindersApiError('getReminderById', r.status);
  const j = await r.json<{ data?: ReminderRow | null }>();
  return j.data ?? null;
}

export async function createReminder(input: CreateReminderInput): Promise<ReminderRow> {
  const body = { user_tz: deviceTimeZone(), ...input, spoken_message: input.spoken_message || input.action_text };
  const r = await call('/api/v1/reminders', { method: 'POST', body: JSON.stringify(body) });
  if (!r.ok) throw new RemindersApiError('createReminder', r.status);
  return (await r.json<{ data: ReminderRow }>()).data;
}

export async function snoozeReminder(id: string, minutes = 10): Promise<void> {
  const r = await call(`/api/v1/reminders/${encodeURIComponent(id)}/snooze`, { method: 'POST', body: JSON.stringify({ minutes }) });
  if (!r.ok) throw new RemindersApiError('snoozeReminder', r.status);
}

export async function ackReminder(id: string, via: 'sse' | 'fcm' | 'manual' | 'manual_replay' = 'manual'): Promise<void> {
  await call(`/api/v1/reminders/${encodeURIComponent(id)}/ack`, { method: 'POST', body: JSON.stringify({ via }) });
}

/** Set when the reminder belonged to an Autopilot slot. */
export interface AutopilotSlotResult {
  ok: boolean;
  recommendation_completed?: boolean;
  route?: string | null;
  title?: string;
}

export async function completeReminderWithSlot(id: string): Promise<{ reminder: ReminderRow; autopilotSlot: AutopilotSlotResult | null }> {
  const r = await call(`/api/v1/reminders/${encodeURIComponent(id)}/complete`, { method: 'POST' });
  if (!r.ok) throw new RemindersApiError('completeReminder', r.status);
  const j = await r.json<{ data: ReminderRow; autopilot_slot?: AutopilotSlotResult | null }>();
  return { reminder: j.data, autopilotSlot: j.autopilot_slot ?? null };
}

/** The screen a completed Autopilot slot opens. Only an in-app path is followed, never another origin. */
export function autopilotSlotRoute(slot: AutopilotSlotResult | null | undefined): string | null {
  const route = slot?.ok ? slot.route : null;
  if (typeof route !== 'string') return null;
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) return null;
  return route;
}

export async function deleteReminder(id: string): Promise<void> {
  const r = await call(`/api/v1/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new RemindersApiError('deleteReminder', r.status);
}

export async function deleteAllReminders(): Promise<{ deleted: number }> {
  const r = await call('/api/v1/reminders?mode=all', { method: 'DELETE' });
  if (!r.ok) throw new RemindersApiError('deleteAllReminders', r.status);
  const j = await r.json<{ deleted?: number }>();
  return { deleted: j.deleted || 0 };
}
