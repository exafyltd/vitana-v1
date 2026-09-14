/** BackOffice › Audit › Command Receipts (BO-056) — VTID-03849, Read tier: every command with its stored bridge receipt. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import CommandsTable from "@/components/backoffice/CommandsTable";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { useBackOfficeCommands } from "@/hooks/useBackOfficeCommands";
import { t } from "@/lib/i18n-toast";

const AUDIT_CAPS = ["audit.view"] as const;

export default function BackOfficeReceipts() {
  const me = useMyErpAccess();
  const [search, setSearch] = useState("");
  const commands = useBackOfficeCommands({ limit: 200 });
  const q = search.trim().toLowerCase();
  const rows = (commands.data ?? []).filter((c) => !q || c.type.toLowerCase().includes(q) || c.command_id.toLowerCase().includes(q) || c.action.toLowerCase().includes(q));

  return (
    <BackOfficePage sectionKey="audit" screenId="BO-056" emoji="🧾" title={t("screens.backoffice.receipts.title")} description={t("screens.backoffice.receipts.description")} capabilities={AUDIT_CAPS}>
      <AdminFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("screens.backoffice.receipts.searchPlaceholder")} onReset={() => setSearch("")} />
      {QueryState({ isLoading: commands.isLoading, error: commands.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.receipts.empty") }) ?? (
        <CommandsTable commands={rows} showReceipt meUserId={me.data?.user_id} />
      )}
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
