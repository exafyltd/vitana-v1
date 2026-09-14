/** BackOffice › Audit › Independent Audit Trail (BO-058) — VTID-03849, Read tier: Vitana's append-only erp_audit_log (GET /audit). */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ChannelBadge } from "@/components/backoffice/CommandBadges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useBackOfficeAudit } from "@/hooks/useBackOfficeCommands";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const AUDIT_CAPS = ["audit.view"] as const;

function eventVariant(event: string): "active" | "warning" | "error" | "inactive" | "info" {
  if (event.endsWith("executed") || event.endsWith("approved")) return "active";
  if (event.endsWith("failed")) return "error";
  if (event.endsWith("rejected") || event.endsWith("refused")) return "warning";
  if (event.endsWith("queued")) return "info";
  return "inactive";
}

export default function BackOfficeAuditTrail() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, AUDIT_CAPS));
  const [search, setSearch] = useState("");
  const audit = useBackOfficeAudit({ limit: 200, enabled });
  const q = search.trim().toLowerCase();
  const rows = (audit.data ?? []).filter((r) => !q || r.event.toLowerCase().includes(q) || (r.command_id ?? "").toLowerCase().includes(q) || (r.actor_id ?? "").toLowerCase().includes(q));

  return (
    <BackOfficePage sectionKey="audit" screenId="BO-058" emoji="🔏" title={t("screens.backoffice.trail.title")} description={t("screens.backoffice.trail.description")} capabilities={AUDIT_CAPS}>
      <AdminFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("screens.backoffice.trail.searchPlaceholder")} onReset={() => setSearch("")} />
      {QueryState({ isLoading: me.isLoading || audit.isLoading, error: audit.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.trail.empty") }) ?? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("screens.backoffice.trail.time")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.event")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.actor")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.role")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.channel")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.command")}</TableHead>
                <TableHead>{t("screens.backoffice.trail.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                  <TableCell><AdminStatusBadge variant={eventVariant(r.event)}><span dir="ltr">{r.event}</span></AdminStatusBadge></TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{me.data && r.actor_id === me.data.user_id ? t("screens.backoffice.commands.you") : shortId(r.actor_id)}</TableCell>
                  <TableCell className="text-xs">{r.actor_role ?? "—"}</TableCell>
                  <TableCell><ChannelBadge channel={r.channel} /></TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    <div>{shortId(r.command_id)}</div>
                    {r.approval_id && <div className="text-[11px] text-muted-foreground">{shortId(r.approval_id)}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-md truncate" dir="ltr" title={JSON.stringify(r.details)}>
                    {Object.entries(r.details ?? {}).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DataSourceNote source="gateway" />
    </BackOfficePage>
  );
}
