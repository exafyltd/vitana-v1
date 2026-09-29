/**
 * VTID-04360 — translated supervisor-facing ticket status labels, shared by
 * the Feedback admin list and the ticket action drawer.
 */
import { t } from '@/lib/i18n-toast';

export const ADMIN_TICKET_STATUSES = [
  'new', 'interviewing', 'triaged', 'spec_pending', 'spec_ready', 'answer_pending', 'answer_ready',
  'approved', 'in_progress', 'resolved', 'user_confirmed', 'duplicate', 'rejected', 'wont_fix',
  'needs_more_info', 'reopened',
] as const;

const KNOWN = new Set<string>(ADMIN_TICKET_STATUSES);

/** Translated status label; an unknown status is shown as-is. */
export function adminStatusLabel(status: string): string {
  return KNOWN.has(status) ? t(`supportTickets.admin.status.${status}`) : status;
}
