/** BackOffice › Audit › ERP Audit Log (BO-057) — VTID-03849, Read tier: ERPClaw's own audit_log via `audit.erp_log.read`. */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const AUDIT_CAPS = ["audit.view"] as const;

interface ErpAuditEntry {
  id: string;
  timestamp: string;
  user_id: string | null;
  skill: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
}
interface ErpAuditLog { entries?: ErpAuditEntry[] }

function summarize(values: Record<string, unknown> | null): string {
  if (!values) return "";
  return Object.entries(values).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
}

export default function BackOfficeErpLog() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, AUDIT_CAPS));
  const log = useErpRead<ErpAuditLog>("audit.erp_log.read", { limit: 100 }, { enabled });
  const entries = log.data?.result?.entries ?? [];

  return (
    <BackOfficePage sectionKey="audit" screenId="BO-057" emoji="📒" title={t("screens.backoffice.erpLog.title")} description={t("screens.backoffice.erpLog.description")} capabilities={AUDIT_CAPS}>
      {QueryState({ isLoading: me.isLoading || log.isLoading, error: log.error, isEmpty: entries.length === 0, emptyTitle: t("screens.backoffice.erpLog.empty") }) ?? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("screens.backoffice.erpLog.time")}</TableHead>
                <TableHead>{t("screens.backoffice.erpLog.skill")}</TableHead>
                <TableHead>{t("screens.backoffice.erpLog.action")}</TableHead>
                <TableHead>{t("screens.backoffice.erpLog.entity")}</TableHead>
                <TableHead>{t("screens.backoffice.erpLog.user")}</TableHead>
                <TableHead>{t("screens.backoffice.erpLog.changes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(e.timestamp, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{e.skill ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{e.action}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    <div>{e.entity_type ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{shortId(e.entity_id)}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{e.user_id ? shortId(e.user_id) : t("screens.backoffice.erpLog.system")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-md truncate" dir="ltr" title={summarize(e.new_values)}>
                    {e.description || summarize(e.new_values) || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DataSourceNote command={log.data?.command} />
    </BackOfficePage>
  );
}
