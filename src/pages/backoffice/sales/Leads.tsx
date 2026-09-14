/** BackOffice › Sales & CRM › Leads (BO-005) — VTID-03855, Read tier: `crm.lead.list` + `crm.lead.get` on selection. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { fullTextMatch, type ErpLead } from "@/lib/backoffice-sales";
import { fmtDateTime } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["crm.view"] as const;

export default function BackOfficeLeads() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const leads = useErpRead<{ leads?: ErpLead[]; total?: number }>("crm.lead.list", { limit: 100 }, { enabled });
  const detail = useErpRead<{ lead?: ErpLead }>("crm.lead.get", { lead_id: selected ?? "" }, { enabled: enabled && !!selected });
  const all = leads.data?.result?.leads ?? [];
  const statuses = Array.from(new Set(all.map((l) => l.status).filter(Boolean)));
  const rows = all.filter((l) => (status === "all" || l.status === status) && fullTextMatch(search, l.lead_name, l.company_name, l.email, l.naming_series, l.source));
  const d = detail.data?.result?.lead;

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-005" emoji="🎯" title={t("screens.backoffice.sales.leads.title")} description={t("screens.backoffice.sales.leads.description")} capabilities={CAPS}>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.sales.leads.searchPlaceholder")}
        filters={[{ value: status, onChange: setStatus, placeholder: t("screens.backoffice.sales.common.status"), options: [{ value: "all", label: t("screens.backoffice.common.all") }, ...statuses.map((s) => ({ value: s, label: s }))] }]}
        onReset={() => { setSearch(""); setStatus("all"); }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || leads.isLoading, error: leads.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.sales.leads.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.leads.lead")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.contact")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.leads.source")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.leads.converted")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.created")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((l) => (
                    <TableRow key={l.id} onClick={() => setSelected(l.id)} className={`cursor-pointer ${selected === l.id ? "bg-muted/60" : ""}`} aria-selected={selected === l.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{l.lead_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{l.naming_series ?? shortId(l.id)}</div>
                        {l.company_name && <div className="text-xs text-muted-foreground">{l.company_name}</div>}
                      </TableCell>
                      <TableCell className="text-xs" dir="ltr">
                        <div>{l.email ?? "—"}</div>
                        <div className="text-muted-foreground">{l.phone ?? ""}</div>
                      </TableCell>
                      <TableCell className="text-xs">{l.source ?? "—"}</TableCell>
                      <TableCell><DocStatusBadge status={l.status} /></TableCell>
                      <TableCell className="text-xs">
                        {l.converted_to_opportunity ? t("screens.backoffice.sales.leads.toOpportunity") : l.converted_to_customer ? t("screens.backoffice.sales.leads.toCustomer") : "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(l.created_at, { dateStyle: "medium" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={leads.data?.command} />
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.common.details")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!selected ? (
              <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.common.selectHint")}</p>
            ) : (
              QueryState({ isLoading: detail.isLoading, error: detail.error, isEmpty: !d, emptyTitle: t("screens.backoffice.errors.notFound"), rows: 5 }) ?? (
                <DetailList rows={[
                  { label: t("screens.backoffice.sales.leads.lead"), value: d!.lead_name },
                  { label: t("screens.backoffice.sales.common.reference"), value: d!.naming_series ?? "—", mono: true },
                  { label: t("screens.backoffice.sales.common.email"), value: d!.email ?? "—", mono: true },
                  { label: t("screens.backoffice.sales.common.phone"), value: d!.phone ?? "—", mono: true },
                  { label: t("screens.backoffice.sales.leads.company"), value: d!.company_name ?? "—" },
                  { label: t("screens.backoffice.sales.leads.source"), value: d!.source ?? "—" },
                  { label: t("screens.backoffice.sales.leads.territory"), value: d!.territory ?? "—" },
                  { label: t("screens.backoffice.sales.leads.industry"), value: d!.industry ?? "—" },
                  { label: t("screens.backoffice.sales.common.status"), value: <DocStatusBadge status={d!.status} /> },
                  { label: t("screens.backoffice.sales.common.assignedTo"), value: d!.assigned_to ?? "—", mono: true },
                  { label: t("screens.backoffice.sales.common.notes"), value: d!.notes ?? "—" },
                  { label: t("screens.backoffice.sales.common.updated"), value: fmtDateTime(d!.updated_at, { dateStyle: "medium", timeStyle: "short" }) },
                ]} />
              )
            )}
            {selected && <DataSourceNote command={detail.data?.command} />}
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
