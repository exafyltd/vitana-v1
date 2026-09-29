/**
 * The Diary's "My reports" list.
 *
 * VTID-04335: this used to read Supabase directly — `user_feedback_reports`
 * (legacy, with a delete button) plus `feedback_tickets` — with its own status
 * names and no ticket number or answer. The 5 legacy rows were migrated into
 * `feedback_tickets` under VTID-04315, so the legacy read and its delete path
 * are gone and the Diary now shows the SAME list as Support → My tickets,
 * filtered to bug / UX reports.
 */
import { MyTicketsList } from "@/components/support/MyTicketsList";

const DIARY_REPORT_KINDS = ["bug", "ux_issue"];

interface FeedbackReportListProps {
  refreshKey?: number;
}

export function FeedbackReportList({ refreshKey }: FeedbackReportListProps) {
  return (
    <MyTicketsList
      kinds={DIARY_REPORT_KINDS}
      refreshKey={refreshKey}
      pageSize={5}
      headingKey="supportTickets.diary.title"
    />
  );
}
