/**
 * BackOffice › Overview › Approvals Inbox (BO-002) — VTID-03849, Read tier.
 * Pending approvals the caller could decide (`can_decide` from the gateway).
 * Deciding is a Commit-level action and ships in the next slice.
 */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import ApprovalsTable from "@/components/backoffice/ApprovalsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useBackOfficeApprovals } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

export default function BackOfficeInbox() {
  const me = useMyErpAccess();
  const anyCapability = !!me.data && (me.data.is_exafy_admin || me.data.capabilities.length > 0);
  const approvals = useBackOfficeApprovals("pending", { enabled: anyCapability });
  const mine = (approvals.data ?? []).filter((a) => a.can_decide);

  return (
    <BackOfficePage sectionKey="overview" screenId="BO-002" emoji="📥" title={t("screens.backoffice.inbox.title")} description={t("screens.backoffice.inbox.description")}>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.common.readOnlySlice")}</p>
      {me.data && !anyCapability ? (
        <p className="text-sm text-muted-foreground">{t("screens.backoffice.dashboard.noCapabilities")}</p>
      ) : (
        QueryState({ isLoading: me.isLoading || approvals.isLoading, error: approvals.error, isEmpty: mine.length === 0, emptyTitle: t("screens.backoffice.inbox.empty"), emptyDescription: t("screens.backoffice.inbox.emptyHint") }) ?? (
          <ApprovalsTable approvals={mine} meUserId={me.data?.user_id} />
        )
      )}
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
