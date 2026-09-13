/**
 * BackOffice › Sales & CRM › Invoices (BO-011) — VTID-03855, Read tier: `sales.invoice.list` + `sales.invoice.get`.
 * Overdue is computed client-side (due date passed, outstanding > 0); ERPClaw's `check-overdue` fails on Postgres today.
 */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import DocumentItemsTable from "@/components/backoffice/DocumentItemsTable";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, AlertTriangle, Coins } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch, isOverdue, num, type ErpSalesInvoice } from "@/lib/backoffice-sales";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { DraftCommandButton } from "@/components/backoffice/DraftCommandDialog";
import { CREDIT_NOTE_SOURCE_STATUSES, creditNoteLinesFromInvoice } from "@/lib/backoffice-draft";

const CAPS = ["sales.view"] as const;

export default function BackOfficeInvoices() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useErpRead<{ sales_invoices?: ErpSalesInvoice[] }>("sales.invoice.list", { limit: 100 }, { enabled });
  const detail = useErpRead<ErpSalesInvoice>("sales.invoice.get", { sales_invoice_id: selected ?? "" }, { enabled: enabled && !!selected });
  const all = (list.data?.result?.sales_invoices ?? []).filter((i) => !(i.is_return === 1 || i.is_return === true));
  const overdueRows = all.filter((i) => isOverdue(i));
  const outstanding = all.reduce((s, i) => s + num(i.outstanding_amount), 0);
  const rows = all.filter((i) => (filter === "all" || (filter === "overdue" ? isOverdue(i) : i.status === filter)) && fullTextMatch(search, i.customer_name, i.naming_series, i.status, i.id));
  const listRow = all.find((i) => i.id === selected);
  const d = detail.data?.result;

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-011" emoji="🧾" title={t("screens.backoffice.sales.invoices.title")} description={t("screens.backoffice.sales.invoices.description")} capabilities={CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.sales.invoices.count")} value={fmtNumber(all.length)} subtitle={t("screens.backoffice.sales.invoices.countHint")} icon={Receipt} loading={enabled && list.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.sales.invoices.outstanding")} value={formatMoney(outstanding)} subtitle={t("screens.backoffice.sales.invoices.outstandingHint")} icon={Coins} loading={enabled && list.isLoading} variant={outstanding > 0 ? "warning" : "default"} />
        <AdminStatsCard title={t("screens.backoffice.sales.invoices.overdue")} value={fmtNumber(overdueRows.length)} subtitle={t("screens.backoffice.sales.invoices.overdueHint")} icon={AlertTriangle} loading={enabled && list.isLoading} variant={overdueRows.length > 0 ? "error" : "default"} />
      </div>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.sales.invoices.searchPlaceholder")}
        filters={[{ value: filter, onChange: setFilter, placeholder: t("screens.backoffice.sales.common.status"), options: [{ value: "all", label: t("screens.backoffice.common.all") }, { value: "overdue", label: t("screens.backoffice.sales.status.overdue") }, ...Array.from(new Set(all.map((i) => i.status))).map((s) => ({ value: s, label: s }))] }]}
        onReset={() => { setSearch(""); setFilter("all"); }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.sales.invoices.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.contacts.customer")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.invoices.posted")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.invoices.due")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.sales.common.total")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.sales.invoices.outstandingCol")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id} onClick={() => setSelected(i.id)} className={`cursor-pointer ${selected === i.id ? "bg-muted/60" : ""}`} aria-selected={selected === i.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">{i.naming_series ?? shortId(i.id)}</TableCell>
                      <TableCell className="text-sm">{i.customer_name ?? shortId(i.customer_id)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(i.posting_date, { dateStyle: "medium" })}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {i.due_date ? fmtDate(i.due_date, { dateStyle: "medium" }) : "—"}
                        {isOverdue(i) && <AdminStatusBadge variant="error" className="ms-2">{t("screens.backoffice.sales.status.overdue")}</AdminStatusBadge>}
                      </TableCell>
                      <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(i.grand_total, i.currency)}</TableCell>
                      <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(i.outstanding_amount, i.currency)}</TableCell>
                      <TableCell><DocStatusBadge status={i.status} /></TableCell>
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
                    { label: t("screens.backoffice.sales.invoices.posted"), value: fmtDate(d!.posting_date, { dateStyle: "medium" }) },
                    { label: t("screens.backoffice.sales.invoices.due"), value: d!.due_date ? fmtDate(d!.due_date, { dateStyle: "medium" }) : "—" },
                    { label: t("screens.backoffice.sales.common.status"), value: <DocStatusBadge status={listRow?.status ?? "draft"} /> },
                    { label: t("screens.backoffice.sales.common.subtotal"), value: formatMoney(d!.total_amount ?? d!.grand_total, d!.currency) },
                    { label: t("screens.backoffice.sales.common.tax"), value: formatMoney(d!.tax_amount ?? 0, d!.currency) },
                    { label: t("screens.backoffice.sales.common.total"), value: <span className="font-medium">{formatMoney(d!.grand_total, d!.currency)}</span> },
                    { label: t("screens.backoffice.sales.invoices.outstandingCol"), value: formatMoney(d!.outstanding_amount, d!.currency) },
                    { label: t("screens.backoffice.sales.invoices.payments"), value: fmtNumber((d!.payments ?? []).length) },
                    { label: t("screens.backoffice.sales.invoices.salesOrder"), value: d!.sales_order_id ? shortId(d!.sales_order_id) : "—", mono: true },
                  ]} />
                  <DocumentItemsTable items={d!.items ?? []} currency={d!.currency} />
                  {/* VTID-03866 — a credit note is a Draft against a POSTED invoice; ERPClaw refuses any other state, so the card only appears for those. */}
                  {(CREDIT_NOTE_SOURCE_STATUSES as readonly string[]).includes(String(listRow?.status ?? "").toLowerCase()) && (
                    <div className="pt-2 border-t">
                      <DraftCommandButton formId="creditNote" variant="outline" initial={{ against_invoice_id: d!.id, items: JSON.stringify(creditNoteLinesFromInvoice(d!.items ?? [])) }} />
                    </div>
                  )}
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
