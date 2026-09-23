/**
 * VTID-04313 — one submit path for in-app bug / UX reports.
 *
 * The Diary recorders (FeedbackRecorder, UnifiedCaptureCard) posted to the
 * legacy `/api/v1/voice-feedback/submit`, which writes `user_feedback_reports`
 * — a table nothing downstream reads: no triage, no Dev Autopilot, no answer
 * back. Every other channel (Support → Contact, Talk to Vitana, the ORB
 * voice tools) already writes the unified `feedback_tickets` pipeline, so the
 * recorders now do too: triage, spec drafting, dispatch with a VTID, and the
 * "resolved" notification all apply.
 */
export type ReportType = 'bug_report' | 'ux_improvement';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface SubmitFeedbackTicketInput {
  gatewayUrl: string;
  accessToken: string;
  transcript: string;
  reportType: ReportType;
  severity: Severity;
  affectedScreen?: string;
  attachments?: string[];
  source: 'diary_recorder' | 'capture_card';
}

export function buildFeedbackTicketBody(input: Omit<SubmitFeedbackTicketInput, 'gatewayUrl' | 'accessToken'>, currentPath?: string) {
  const attachments = (input.attachments ?? []).filter(Boolean);
  return {
    raw_text: input.transcript.trim(),
    kind: input.reportType === 'bug_report' ? 'bug' : 'ux_issue',
    screen_path: (input.affectedScreen || currentPath || '').slice(0, 500) || undefined,
    ...(attachments[0] ? { screenshot_url: attachments[0] } : {}),
    structured_fields: {
      severity: input.severity,
      attachments,
      affected_screen: input.affectedScreen || null,
      source: input.source,
    },
  };
}

export async function submitFeedbackTicket(input: SubmitFeedbackTicketInput): Promise<{ ok: boolean; error?: string; ticket_number?: string }> {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined;
  const res = await fetch(`${input.gatewayUrl}/api/v1/feedback/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify(buildFeedbackTicketBody(input, currentPath)),
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; details?: string; ticket_number?: string };
  if (!res.ok || !body.ok) return { ok: false, error: body.details || body.error || `HTTP ${res.status}` };
  return { ok: true, ticket_number: body.ticket_number };
}

/**
 * VTID-04335 — ONE status vocabulary for every member-facing ticket list
 * (Support → My tickets, Talk to Vitana, the Diary report list). The
 * pipeline has ~16 internal statuses; a member only ever sees these six.
 */
export type MemberTicketStatus = 'received' | 'under_review' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate';

export const TICKET_STATUS_MAP: Record<string, MemberTicketStatus> = {
  new: 'received', interviewing: 'received',
  triaged: 'under_review', spec_pending: 'under_review', spec_ready: 'under_review',
  answer_pending: 'under_review', answer_ready: 'under_review',
  needs_more_info: 'under_review', reopened: 'under_review',
  approved: 'in_progress', in_progress: 'in_progress',
  resolved: 'fixed', user_confirmed: 'fixed',
  wont_fix: 'wont_fix', rejected: 'wont_fix',
  duplicate: 'duplicate',
};

/** Unknown / future pipeline statuses read as "received", never as raw internals. */
export function memberTicketStatus(status: string | null | undefined): MemberTicketStatus {
  return (status && TICKET_STATUS_MAP[status]) || 'received';
}

/** The happy-path timeline shown to the member, in order. */
export const MEMBER_TIMELINE: MemberTicketStatus[] = ['received', 'under_review', 'in_progress', 'fixed'];

/** Index of `status` on the timeline, or -1 for a closed-without-fix ticket. */
export function timelineStep(status: MemberTicketStatus): number {
  return MEMBER_TIMELINE.indexOf(status);
}

export type TicketKind = 'bug' | 'ux_issue' | 'support_question' | 'account_issue' | 'marketplace_claim' | 'feature_request' | 'feedback';
export const TICKET_KINDS: TicketKind[] = ['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request'];

/** React Query key shared by every member ticket list (and its invalidators). */
export const MY_TICKETS_QUERY_KEY = ['feedback-tickets-mine'] as const;

/** Row shape returned by GET /api/v1/feedback/tickets/mine. */
export interface MemberTicket {
  id: string;
  ticket_number: string;
  kind: string;
  status: string;
  priority?: string | null;
  surface?: string | null;
  created_at: string;
  resolver_agent?: string | null;
  resolved_at?: string | null;
  user_confirmed_at?: string | null;
  // VTID-04312: returned once the ticket is resolved.
  answer_md?: string | null;
  resolution_md?: string | null;
  // Optional — rendered only when the gateway includes it.
  raw_transcript?: string | null;
  structured_fields?: { voice_origin?: boolean; severity?: Severity } | null;
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

/**
 * VTID-04335 — Support → Contact (mobile and desktop) builds the same body.
 * `surface:'support'` pins these into the human-only queue the auto-triage
 * routine skips.
 */
export const SUPPORT_CATEGORIES = ['account', 'billing', 'technical', 'feature', 'privacy', 'other'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

const KIND_BY_SUPPORT_CATEGORY: Record<SupportCategory, TicketKind> = {
  account: 'account_issue',
  billing: 'account_issue',
  technical: 'bug',
  feature: 'feature_request',
  privacy: 'support_question',
  other: 'support_question',
};

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
