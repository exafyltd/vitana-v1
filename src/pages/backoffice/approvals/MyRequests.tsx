/** BackOffice › Approvals › My Requests (BO-054) — VTID-03849, Read tier: the caller's own commands. */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import CommandsTable from "@/components/backoffice/CommandsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useBackOfficeCommands } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

export default function BackOfficeMyRequests() {
  const me = useMyErpAccess();
  const commands = useBackOfficeCommands({ limit: 200 });
  // The gateway already narrows to own rows for callers without audit.view; narrow again for everyone else.
  const rows = (commands.data ?? []).filter((c) => !me.data || c.requester_id === me.data.user_id);
  const open = rows.filter((c) => c.status === "awaiting_approval");
  const rest = rows.filter((c) => c.status !== "awaiting_approval");

  return (
    <BackOfficePage sectionKey="approvals" screenId="BO-054" emoji="🙋" title={t("screens.backoffice.myRequests.title")} description={t("screens.backoffice.myRequests.description")}>
      {QueryState({ isLoading: me.isLoading || commands.isLoading, error: commands.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.myRequests.empty") }) ?? (
        <div className="space-y-6">
          {open.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">{t("screens.backoffice.myRequests.awaiting")}</h2>
              <CommandsTable commands={open} showRequester={false} />
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">{t("screens.backoffice.myRequests.history")}</h2>
              <CommandsTable commands={rest} showRequester={false} />
            </section>
          )}
        </div>
      )}
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
