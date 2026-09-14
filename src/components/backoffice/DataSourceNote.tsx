/**
 * VTID-03849 — design gate §1.3: a Read shows "data, with source + as-of
 * timestamp". One line under every ERP-sourced block.
 */
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import type { BackOfficeCommand } from "@/hooks/useBackOfficeCommands";
import { commandAsOf } from "@/hooks/useBackOfficeCommands";

export default function DataSourceNote({ command, source }: { command?: BackOfficeCommand | null; source?: "erp" | "gateway" }) {
  const asOf = commandAsOf(command);
  const src = source ?? "erp";
  return (
    <p className="text-xs text-muted-foreground">
      {t(`screens.backoffice.common.source.${src}`)}
      {asOf ? ` · ${t("screens.backoffice.common.asOf", { time: fmtDateTime(asOf, { dateStyle: "medium", timeStyle: "short" }) })}` : ""}
      {command?.replayed ? ` · ${t("screens.backoffice.common.replayed")}` : ""}
    </p>
  );
}
