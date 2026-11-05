/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the two
 * calendar-invite kinds a chat bubble shows:
 *
 *  - v2 cards the gateway builds from a calendar entry (VTID-04917,
 *    `content_data.kind === 'calendar_invite'`, web
 *    `src/lib/calendar-window-client.ts`): `GET /api/v1/calendar/invites/:id`
 *    (my answer, counts, is_sender) and `POST …/respond` { response };
 *  - legacy v1 invites with Accept / Decline / Maybe action buttons (web
 *    `CalendarInviteStatus` + `useCalendarEvents.respondToInvite` + the
 *    ConversationView action handler): the answer is upserted into
 *    `calendar_invite_responses` (message_id, user_id); declining removes the
 *    member's event from this message, accepting / maybe creates (or updates
 *    the status of) the member's `calendar_events` row with
 *    `source_message_id` = the message.
 */
import { getGateway } from '../../../auth/gateway';
import { getSupabase } from '../../../auth/client';

export type InviteResponse = 'accepted' | 'maybe' | 'declined';
export type InviteAction = 'joined' | 'open_event' | 'open_room' | 'added' | 'removed' | 'recorded';

export interface CalendarInviteCardData {
  kind: 'calendar_invite';
  v: 2;
  ref_type: 'community_event' | 'live_room_session' | 'calendar_entry';
  ref_id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
}

export function isInviteCard(data: unknown): data is CalendarInviteCardData {
  const d = data as Partial<CalendarInviteCardData> | null;
  return (
    !!d &&
    d.kind === 'calendar_invite' &&
    d.v === 2 &&
    (d.ref_type === 'community_event' || d.ref_type === 'live_room_session' || d.ref_type === 'calendar_entry') &&
    typeof d.start_time === 'string'
  );
}

export function inviteIsOver(invite: CalendarInviteCardData, now: Date = new Date()): boolean {
  const start = Date.parse(invite.start_time);
  const end = invite.end_time ? Date.parse(invite.end_time) : start + 60 * 60_000;
  return Number.isFinite(end) && end <= now.getTime();
}

export interface InviteState {
  my_response: InviteResponse | null;
  counts: Record<InviteResponse, number>;
  is_sender: boolean;
}

export class CalendarApiError extends Error {}

async function authed(path: string, init: RequestInit = {}): Promise<{ data?: unknown }> {
  const res = await getGateway()(path, { ...init, headers: { 'Content-Type': 'application/json', ...((init.headers as Record<string, string>) ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; data?: unknown };
  if (!res.ok || body?.ok === false) throw new CalendarApiError(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`);
  return body;
}

export async function fetchInviteState(messageId: string): Promise<InviteState> {
  return (await authed(`/calendar/invites/${encodeURIComponent(messageId)}`)).data as InviteState;
}

export async function respondToCalendarInvite(messageId: string, response: InviteResponse): Promise<{ response: InviteResponse; action: InviteAction; path?: string }> {
  return (await authed(`/calendar/invites/${encodeURIComponent(messageId)}/respond`, { method: 'POST', body: JSON.stringify({ response }) })).data as {
    response: InviteResponse;
    action: InviteAction;
    path?: string;
  };
}

// ── legacy v1 invites ───────────────────────────────────────────────────

export interface LegacyInviteResponse {
  user_id: string;
  response: InviteResponse;
  responded_at?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isValidUUID = (v?: string | null) => !!v && UUID.test(v);

const normalize = (r: string): InviteResponse => (r === 'accept' ? 'accepted' : r === 'decline' ? 'declined' : (r as InviteResponse));

export async function getInviteResponse(messageId: string, userId: string): Promise<LegacyInviteResponse | null> {
  const { data, error } = await getSupabase()
    .from('calendar_invite_responses')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .order('responded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const row = data as LegacyInviteResponse | null;
  return row ? { ...row, response: normalize(row.response) } : null;
}

export async function getAllInviteResponses(messageId: string): Promise<LegacyInviteResponse[]> {
  const { data, error } = await getSupabase().from('calendar_invite_responses').select('*').eq('message_id', messageId).order('responded_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as LegacyInviteResponse[]).map((r) => ({ ...r, response: normalize(r.response) }));
}

/** The event a v1 invite describes (MessageInput.sendCalendarInvite's content_data). */
export interface LegacyInviteData {
  title?: string;
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  description?: string;
  type?: string;
  priority?: string;
  attendees?: number;
  hasRewards?: boolean;
}

function composeIso(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const dt = new Date(dateStr);
  if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
    const [h, m] = timeStr.split(':').map(Number);
    dt.setHours(h, m, 0, 0);
  }
  return dt.toISOString();
}

const EVENT_TYPES = new Set(['personal', 'meeting', 'community', 'health', 'work', 'social', 'wellness', 'other']);

export async function respondToLegacyInvite(messageId: string, userId: string, response: InviteResponse, eventData: LegacyInviteData | null): Promise<{ eventId?: string; error?: unknown }> {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from('calendar_invite_responses')
    .upsert({ message_id: messageId, user_id: userId, event_id: null, response, responded_at: now } as never, { onConflict: 'message_id,user_id' });
  if (upsertError) throw upsertError;
  if (response === 'declined') {
    await supabase.from('calendar_events').delete().eq('user_id', userId).eq('source_message_id', messageId);
    return {};
  }
  if (!eventData) return {};
  const status = response === 'accepted' ? 'confirmed' : 'pending';
  try {
    const { data: existing } = await supabase.from('calendar_events').select('id, status').eq('user_id', userId).eq('source_message_id', messageId).limit(1).maybeSingle();
    let eventId: string;
    const prior = existing as { id: string; status: string } | null;
    if (prior) {
      if (prior.status !== status) await supabase.from('calendar_events').update({ status } as never).eq('id', prior.id);
      eventId = prior.id;
    } else {
      const start_time = composeIso(eventData.date, eventData.time);
      const end_time = eventData.endDate || eventData.endTime ? composeIso(eventData.endDate || eventData.date, eventData.endTime) : null;
      const eventType = eventData.type && EVENT_TYPES.has(eventData.type) ? eventData.type : 'personal';
      const { data: created, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          title: eventData.title || 'Calendar Event',
          description: eventData.description ?? null,
          start_time,
          end_time,
          location: eventData.location ?? null,
          event_type: eventType,
          status,
          priority: eventData.priority || 'medium',
          is_recurring: false,
          attendees_count: eventData.attendees || 0,
          has_rewards: !!eventData.hasRewards,
          metadata: { originalMessage: eventData },
          source_message_id: messageId,
          source_type: 'invite',
        } as never)
        .select('id')
        .single();
      if (error) throw error;
      eventId = (created as { id: string }).id;
    }
    await supabase.from('calendar_invite_responses').update({ event_id: eventId } as never).eq('message_id', messageId).eq('user_id', userId);
    return { eventId };
  } catch (error) {
    return { error };
  }
}
