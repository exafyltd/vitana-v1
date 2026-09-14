/** BackOffice › Approvals › Queue (BO-053) — VTID-03849 Read tier; VTID-03873 approve / reject from the row (ApprovalDecisionDialog). */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import ApprovalsTable from "@/components/backoffice/ApprovalsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useBackOfficeApprovals, type ApprovalStatus, type BackOfficeApproval } from "@/hooks/useBackOfficeCommands";
import { ApprovalDecisionDialog } from "@/components/backoffice/ApprovalDecisionDialog";
import type { Verdict } from "@/lib/backoffice-approvals";
import { t } from "@/lib/i18n-toast";

const STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected"];

export default function BackOfficeApprovalsQueue() {
  const me = useMyErpAccess();
  const anyCapability = !!me.data && (me.data.is_exafy_admin || me.data.capabilities.length > 0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [deciding, setDeciding] = useState<{ approval: BackOfficeApproval; verdict: Verdict } | null>(null);
  const approvals = useBackOfficeApprovals(status, { limit: 200, enabled: anyCapability });
  const q = search.trim().toLowerCase();
  const rows = (approvals.data ?? []).filter((a) => !q || a.command_id.toLowerCase().includes(q) || a.approve_capability.toLowerCase().includes(q) || a.requester_id.toLowerCase().includes(q));

  return (
    <BackOfficePage sectionKey="approvals" screenId="BO-053" emoji="✅" title={t("screens.backoffice.queue.title")} description={t("screens.backoffice.queue.description")}>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.decide.queueHint")}</p>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.queue.searchPlaceholder")}
        filters={[{
          value: status,
          onChange: (v) => setStatus(v as ApprovalStatus),
          placeholder: t("screens.backoffice.queue.statusFilter"),
          options: STATUSES.map((s) => ({ value: s, label: t(`screens.backoffice.approvalStatus.${s}`) })),
        }]}
        onReset={() => { setSearch(""); setStatus("pending"); }}
      />
      {me.data && !anyCapability ? (
        <p className="text-sm text-muted-foreground">{t("screens.backoffice.dashboard.noCapabilities")}</p>
      ) : (
        QueryState({ isLoading: me.isLoading || approvals.isLoading, error: approvals.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.queue.empty") }) ?? (
          <ApprovalsTable approvals={rows} meUserId={me.data?.user_id} onDecide={(approval, verdict) => setDeciding({ approval, verdict })} />
        )
      )}
      <DataSourceNote source="gateway" />
      {deciding && <ApprovalDecisionDialog key={`${deciding.approval.id}-${deciding.verdict}`} approval={deciding.approval} verdict={deciding.verdict} open onOpenChange={(o) => { if (!o) setDeciding(null); }} />}
    </BackOfficePage>
  );
}
