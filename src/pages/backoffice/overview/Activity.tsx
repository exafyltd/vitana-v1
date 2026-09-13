/** BackOffice › Overview › Activity (BO-003) — VTID-03849, Read tier: the tenant's command history. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import CommandsTable from "@/components/backoffice/CommandsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useBackOfficeCommands, type CommandStatus } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

const STATUSES: CommandStatus[] = ["executed", "awaiting_approval", "failed", "rejected"];

export default function BackOfficeActivity() {
  const me = useMyErpAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const commands = useBackOfficeCommands({ status: status === "all" ? undefined : (status as CommandStatus), limit: 200 });
  const q = search.trim().toLowerCase();
  const rows = (commands.data ?? []).filter((c) => !q || c.type.toLowerCase().includes(q) || c.command_id.toLowerCase().includes(q) || (c.reason ?? "").toLowerCase().includes(q));

  return (
    <BackOfficePage sectionKey="overview" screenId="BO-003" emoji="🕒" title={t("screens.backoffice.activity.title")} description={t("screens.backoffice.activity.description")}>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.activity.searchPlaceholder")}
        filters={[{
          value: status,
          onChange: setStatus,
          placeholder: t("screens.backoffice.activity.statusFilter"),
          options: [{ value: "all", label: t("screens.backoffice.common.all") }, ...STATUSES.map((s) => ({ value: s, label: t(`screens.backoffice.commandStatus.${s}`) }))],
        }]}
        onReset={() => { setSearch(""); setStatus("all"); }}
      />
      {QueryState({ isLoading: commands.isLoading, error: commands.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.activity.empty") }) ?? (
        <CommandsTable commands={rows} meUserId={me.data?.user_id} />
      )}
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
