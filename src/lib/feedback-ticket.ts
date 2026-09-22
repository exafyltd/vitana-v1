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

/** The Diary report list's row shape (FeedbackReportList). */
export interface FeedbackListReport {
  id: string;
  transcript: string;
  report_type: ReportType;
  severity: Severity;
  affected_screen: string | null;
  status: string;
  vtid: string | null;
  created_at: string;
  attachments: string[];
  source?: 'legacy' | 'ticket';
}

// VTID-04313: map a unified feedback_tickets row onto this list's shape.
const TICKET_STATUS_MAP: Record<string, string> = {
  new: 'received', interviewing: 'received', triaged: 'under_review',
  spec_pending: 'under_review', spec_ready: 'under_review', answer_pending: 'under_review',
  answer_ready: 'under_review', approved: 'in_progress', in_progress: 'in_progress',
  needs_more_info: 'under_review', reopened: 'under_review',
  resolved: 'fixed', user_confirmed: 'fixed', wont_fix: 'wont_fix', rejected: 'wont_fix', duplicate: 'duplicate',
};

export interface FeedbackTicketListRow {
  id: string;
  kind: string;
  status: string;
  raw_transcript: string | null;
  structured_fields: { severity?: Severity; attachments?: string[]; affected_screen?: string | null } | null;
  screen_path: string | null;
  linked_vtid: string | null;
  created_at: string;
}

export function ticketToReport(row: FeedbackTicketListRow): FeedbackListReport {
  const sf = row.structured_fields ?? {};
  return {
    id: row.id,
    transcript: row.raw_transcript ?? '',
    report_type: row.kind === 'bug' ? 'bug_report' : 'ux_improvement',
    severity: sf.severity ?? 'medium',
    affected_screen: sf.affected_screen ?? row.screen_path ?? null,
    status: TICKET_STATUS_MAP[row.status] ?? 'received',
    vtid: row.linked_vtid,
    created_at: row.created_at,
    attachments: Array.isArray(sf.attachments) ? sf.attachments : [],
    source: 'ticket',
  };
}
