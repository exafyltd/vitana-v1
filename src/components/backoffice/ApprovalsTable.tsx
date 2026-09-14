/**
 * VTID-03849 — approval rows from GET /api/v1/backoffice/approvals (Queue,
 * Approvals Inbox). Read tier: `can_decide` is shown, never acted on here —
 * approve/reject execute the High-risk command and belong to the next slice.
 */
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ApprovalStatusBadge } from "@/components/backoffice/CommandBadges";
import type { BackOfficeApproval } from "@/hooks/useBackOfficeCommands";
import { shortId } from "@/hooks/useBackOfficeCommands";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function ApprovalsTable({ approvals, meUserId }: { approvals: BackOfficeApproval[]; meUserId?: string | null }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("screens.backoffice.approvals.requested")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.command")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.requester")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.approverNeeds")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.status")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.decision")}</TableHead>
            <TableHead>{t("screens.backoffice.approvals.you")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {approvals.map((a) => {
            const mine = !!meUserId && a.requester_id === meUserId;
            return (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(a.created_at, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  <div>{shortId(a.command_id)}</div>
                  {a.reason && <div className="text-[11px] text-muted-foreground">{a.reason}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">{mine ? t("screens.backoffice.commands.you") : shortId(a.requester_id)}</TableCell>
                <TableCell><AdminStatusBadge variant="error">{a.approve_capability}</AdminStatusBadge></TableCell>
                <TableCell><ApprovalStatusBadge status={a.status} /></TableCell>
                <TableCell className="text-xs">
                  {a.decided_at ? (
                    <div>
                      <div>{fmtDateTime(a.decided_at, { dateStyle: "medium", timeStyle: "short" })}</div>
                      <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{shortId(a.decided_by)}</div>
                      {a.decision_note && <div className="text-muted-foreground">{a.decision_note}</div>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {a.status !== "pending" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : mine ? (
                    <span className="text-muted-foreground">{t("screens.backoffice.approvals.yourOwnRequest")}</span>
                  ) : a.can_decide ? (
                    <AdminStatusBadge variant="info">{t("screens.backoffice.approvals.youCanDecide")}</AdminStatusBadge>
                  ) : (
                    <span className="text-muted-foreground">{t("screens.backoffice.approvals.youCannotDecide")}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
