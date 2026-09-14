/** BackOffice › Sales & CRM › Quotations (BO-009) — VTID-03855, Read tier: `sales.quotation.list` + `sales.quotation.get`. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import DocumentItemsTable from "@/components/backoffice/DocumentItemsTable";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch, type ErpQuotation } from "@/lib/backoffice-sales";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["sales.view"] as const;

export default function BackOfficeQuotations() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useErpRead<{ quotations?: ErpQuotation[] }>("sales.quotation.list", { limit: 100 }, { enabled });
  const detail = useErpRead<ErpQuotation>("sales.quotation.get", { quotation_id: selected ?? "" }, { enabled: enabled && !!selected });
  const rows = (list.data?.result?.quotations ?? []).filter((q) => fullTextMatch(search, q.customer_name, q.naming_series, q.status, q.id));
  const listRow = rows.find((q) => q.id === selected) ?? (list.data?.result?.quotations ?? []).find((q) => q.id === selected);
  const d = detail.data?.result;

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-009" emoji="📄" title={t("screens.backoffice.sales.quotations.title")} description={t("screens.backoffice.sales.quotations.description")} capabilities={CAPS}>
      <AdminFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("screens.backoffice.sales.quotations.searchPlaceholder")} onReset={() => setSearch("")} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.sales.quotations.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.contacts.customer")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.date")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.sales.common.total")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((q) => (
                    <TableRow key={q.id} onClick={() => setSelected(q.id)} className={`cursor-pointer ${selected === q.id ? "bg-muted/60" : ""}`} aria-selected={selected === q.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">{q.naming_series ?? shortId(q.id)}</TableCell>
                      <TableCell className="text-sm">{q.customer_name ?? shortId(q.customer_id)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(q.quotation_date, { dateStyle: "medium" })}</TableCell>
                      <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(q.grand_total, q.currency)}</TableCell>
                      <TableCell><DocStatusBadge status={q.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={list.data?.command} />
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.common.details")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selected ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.common.selectHint")}</p> : (
              QueryState({ isLoading: detail.isLoading, error: detail.error, isEmpty: !d, emptyTitle: t("screens.backoffice.errors.notFound"), rows: 5 }) ?? (
                <>
                  <DetailList rows={[
                    { label: t("screens.backoffice.sales.common.reference"), value: d!.naming_series ?? shortId(d!.id), mono: true },
                    { label: t("screens.backoffice.sales.contacts.customer"), value: listRow?.customer_name ?? shortId(d!.customer_id) },
                    { label: t("screens.backoffice.sales.common.date"), value: fmtDate(d!.quotation_date, { dateStyle: "medium" }) },
                    { label: t("screens.backoffice.sales.quotations.validUntil"), value: d!.valid_until ? fmtDate(d!.valid_until, { dateStyle: "medium" }) : "—" },
                    { label: t("screens.backoffice.sales.common.status"), value: <DocStatusBadge status={listRow?.status ?? d!.status} /> },
                    { label: t("screens.backoffice.sales.common.subtotal"), value: formatMoney(d!.total_amount ?? d!.grand_total, d!.currency) },
                    { label: t("screens.backoffice.sales.common.tax"), value: formatMoney(d!.tax_amount ?? 0, d!.currency) },
                    { label: t("screens.backoffice.sales.common.total"), value: <span className="font-medium">{formatMoney(d!.grand_total, d!.currency)}</span> },
                    { label: t("screens.backoffice.sales.quotations.convertedTo"), value: d!.converted_to ? shortId(d!.converted_to) : "—", mono: true },
                  ]} />
                  <DocumentItemsTable items={d!.items ?? []} currency={d!.currency} />
                </>
              )
            )}
            {selected && <DataSourceNote command={detail.data?.command} />}
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
