/**
 * VTID-05432 (Native Wave 2, support-connectors lane) — native twin of the
 * member side of the feedback-ticket pipeline (web `src/lib/feedback-ticket.ts`
 * and the `MyTicketsList` query). The web module is reached through
 * `communityFetch` / the web Supabase client (class B), so it is re-implemented
 * here against the native gateway fetch (which prepends `/api/v1` and adds the
 * member's bearer token). Shapes and vocabularies mirror the web 1:1.
 *
 *   POST /api/v1/feedback/tickets                 Support → Contact (a write)
 *   GET  /api/v1/feedback/tickets/mine?limit=100  My tickets (read)
 *   POST /api/v1/feedback/tickets/:id/confirm     "Yes, fixed" (a write)
 *   POST /api/v1/feedback/tickets/:id/reopen      "No, still broken" (a write)
 */
import { useQuery } from '@tanstack/react-query';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';

/** The web's community role header (`communityFetch`), so the gateway scopes the member the same way. */
const ROLE_HEADERS = { 'X-Vitana-Active-Role': 'community' } as const;

export const SUPPORT_CATEGORIES = ['account', 'billing', 'technical', 'feature', 'privacy', 'other'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export type TicketKind = 'bug' | 'ux_issue' | 'support_question' | 'account_issue' | 'marketplace_claim' | 'feature_request' | 'feedback';

const KIND_BY_SUPPORT_CATEGORY: Record<SupportCategory, TicketKind> = {
  account: 'account_issue',
  billing: 'account_issue',
  technical: 'bug',
  feature: 'feature_request',
  privacy: 'support_question',
  other: 'support_question',
};

/** Twin of `buildSupportContactBody` (feedback-ticket.ts): Support → Contact builds this body. */
export function buildSupportContactBody(input: {
  message: string;
  category: SupportCategory | '' | null;
  entryMethod: 'voice' | 'text';
  attachments?: string[];
}) {
  const attachments = (input.attachments ?? []).filter(Boolean);
  const category = input.category || null;
  return {
    raw_text: input.message.trim(),
    kind: category ? KIND_BY_SUPPORT_CATEGORY[category] : 'support_question',
    surface: 'support',
    screen_path: category ? `support/contact:${category}` : 'support/contact',
    screenshot_url: attachments[0] || undefined,
    structured_fields: {
      source: 'support_contact',
      category,
      entry_method: input.entryMethod,
      attachments,
    },
  };
}

export type MemberTicketStatus = 'received' | 'under_review' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate';

const TICKET_STATUS_MAP: Record<string, MemberTicketStatus> = {
  new: 'received',
  interviewing: 'received',
  triaged: 'under_review',
  spec_pending: 'under_review',
  spec_ready: 'under_review',
  answer_pending: 'under_review',
  answer_ready: 'under_review',
  needs_more_info: 'under_review',
  reopened: 'under_review',
  approved: 'in_progress',
  in_progress: 'in_progress',
  resolved: 'fixed',
  user_confirmed: 'fixed',
  wont_fix: 'wont_fix',
  rejected: 'wont_fix',
  duplicate: 'duplicate',
};

/** Unknown / future pipeline statuses read as "received", never as raw internals. */
export function memberTicketStatus(status: string | null | undefined): MemberTicketStatus {
  return (status && TICKET_STATUS_MAP[status]) || 'received';
}

export const MEMBER_TIMELINE: MemberTicketStatus[] = ['received', 'under_review', 'in_progress', 'fixed'];

export function timelineStep(status: MemberTicketStatus): number {
  return MEMBER_TIMELINE.indexOf(status);
}

export interface MemberTicket {
  id: string;
  ticket_number: string;
  kind: string;
  status: string;
  created_at: string;
  resolver_agent?: string | null;
  answer_md?: string | null;
  resolution_md?: string | null;
  raw_transcript?: string | null;
  structured_fields?: { voice_origin?: boolean; severity?: 'low' | 'medium' | 'high' | 'critical' } | null;
}

/** The text shown as "our answer": only for resolved tickets, never a draft. */
export function ticketAnswer(ticket: Pick<MemberTicket, 'status' | 'answer_md' | 'resolution_md'>): string | null {
  if (memberTicketStatus(ticket.status) !== 'fixed') return null;
  const text = (ticket.answer_md || ticket.resolution_md || '').trim();
  return text || null;
}

/** Does `highlight` (a ticket id or FB-number from ?ticket=) point at this ticket? */
export function matchesTicketRef(ticket: Pick<MemberTicket, 'id' | 'ticket_number'>, highlight: string | null | undefined): boolean {
  if (!highlight) return false;
  const h = highlight.trim();
  return h === ticket.id || h.toUpperCase() === (ticket.ticket_number || '').toUpperCase();
}

export const MY_TICKETS_QUERY_KEY = ['feedback-tickets-mine'] as const;

export function useMyTickets() {
  return useQuery<MemberTicket[]>({
    queryKey: MY_TICKETS_QUERY_KEY,
    queryFn: async () => {
      const json = await gatewayJson<{ tickets?: MemberTicket[] }>(getGateway(), '/feedback/tickets/mine?limit=100', { headers: ROLE_HEADERS });
      return json.tickets ?? [];
    },
    // Voice-captured tickets and status changes show up without a manual refresh (web: 30 s).
    refetchInterval: 30_000,
  });
}

export type CreatedTicket = { id: string; ticket_number: string } | null;

/** Support → Contact submit. Throws on a non-OK reply or `{ ok: false }` (web handleSubmit). */
export async function submitSupportContact(body: ReturnType<typeof buildSupportContactBody>): Promise<CreatedTicket> {
  const result = await gatewayJson<{ ok?: boolean; error?: string; id?: string; ticket_number?: string }>(getGateway(), '/feedback/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!result?.ok) throw new Error(result?.error || 'Submit failed');
  return result.id && result.ticket_number ? { id: result.id, ticket_number: result.ticket_number } : null;
}

export async function ticketAction(id: string, action: 'confirm' | 'reopen'): Promise<void> {
  await gatewayJson(getGateway(), `/feedback/tickets/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers: ROLE_HEADERS });
}
