/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — the Bug Reports mode's
 * tickets. The web `src/lib/feedback-ticket.ts` pure parts (the member status
 * vocabulary, the timeline, `ticketAnswer`, `buildFeedbackTicketBody`) are
 * MIRRORED here: the module also holds `submitFeedbackTicket`, which calls
 * `fetch` and reads `window`, so it is not a core re-export candidate (plan
 * decision 2). The calls of `MyTicketsList.tsx` and `UnifiedCaptureCard.tsx`
 * go through the community gateway (Bearer + `X-Vitana-Active-Role: community`):
 *
 *  - `GET  /feedback/tickets/mine?limit=100` → `{ tickets }`, refetched every 30 s
 *  - `POST /feedback/tickets/:id/confirm` | `/reopen`
 *  - `POST /feedback/tickets` (the unified pipeline, VTID-04313) → `{ ok, ticket_number }`
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { diaryJson } from './client';

export type ReportType = 'bug_report' | 'ux_improvement';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type MemberTicketStatus = 'received' | 'under_review' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate';

export const TICKET_STATUS_MAP: Record<string, MemberTicketStatus> = {
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

export const KNOWN_KINDS = new Set(['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request']);

/** The Diary shows bug / UX reports only (web FeedbackReportList DIARY_REPORT_KINDS). */
export const DIARY_REPORT_KINDS = ['bug', 'ux_issue'];

export type MemberTicket = {
  id: string;
  ticket_number: string;
  kind: string;
  status: string;
  created_at: string;
  resolver_agent?: string | null;
  answer_md?: string | null;
  resolution_md?: string | null;
  raw_transcript?: string | null;
  structured_fields?: { voice_origin?: boolean; severity?: Severity } | null;
};

/** The text shown as "our answer": only for resolved tickets, never a draft. */
export function ticketAnswer(ticket: Pick<MemberTicket, 'status' | 'answer_md' | 'resolution_md'>): string | null {
  if (memberTicketStatus(ticket.status) !== 'fixed') return null;
  const text = (ticket.answer_md || ticket.resolution_md || '').trim();
  return text || null;
}

export const MY_TICKETS_QUERY_KEY = ['feedback-tickets-mine'] as const;

export function useMyTickets() {
  return useQuery<MemberTicket[]>({
    queryKey: MY_TICKETS_QUERY_KEY,
    queryFn: async () => (await diaryJson<{ tickets?: MemberTicket[] }>('/feedback/tickets/mine?limit=100')).tickets ?? [],
    refetchInterval: 30_000,
  });
}

export function useTicketAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'confirm' | 'reopen' }) => diaryJson(`/feedback/tickets/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MY_TICKETS_QUERY_KEY }),
  });
}

export type FeedbackTicketInput = {
  transcript: string;
  reportType: ReportType;
  severity: Severity;
  affectedScreen?: string;
  attachments?: string[];
  source: 'diary_recorder' | 'capture_card';
};

/** web `buildFeedbackTicketBody` (currentPath: the screen the report was sent from). */
export function buildFeedbackTicketBody(input: FeedbackTicketInput, currentPath?: string) {
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

/** Sends a report into the unified `feedback_tickets` pipeline; returns its FB-number. */
export async function submitFeedbackTicket(input: FeedbackTicketInput, currentPath = '/daily-diary'): Promise<{ ticket_number?: string }> {
  const body = await diaryJson<{ ok?: boolean; ticket_number?: string; error?: string }>('/feedback/tickets', {
    method: 'POST',
    body: JSON.stringify(buildFeedbackTicketBody(input, currentPath)),
  });
  if (!body.ok) throw new Error(body.error || 'Submit failed');
  return { ticket_number: body.ticket_number };
}
