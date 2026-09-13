/** BackOffice › Sales & CRM › Credit Notes (BO-012) — VTID-03855, Read tier: `sales.credit_note.list` (a credit note is a sales return against a posted invoice). */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch, type ErpCreditNote } from "@/lib/backoffice-sales";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["sales.view"] as const;

export default function BackOfficeCreditNotes() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const list = useErpRead<{ credit_notes?: ErpCreditNote[] }>("sales.credit_note.list", { limit: 100 }, { enabled });
  const rows = (list.data?.result?.credit_notes ?? []).filter((c) => fullTextMatch(search, c.customer_name, c.naming_series, c.status, c.return_against));

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-012" emoji="↩️" title={t("screens.backoffice.sales.creditNotes.title")} description={t("screens.backoffice.sales.creditNotes.description")} capabilities={CAPS}>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.sales.creditNotes.highRiskNote")}</p>
      <AdminFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("screens.backoffice.sales.creditNotes.searchPlaceholder")} onReset={() => setSearch("")} />
      {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.sales.creditNotes.empty"), emptyDescription: t("screens.backoffice.sales.creditNotes.emptyHint") }) ?? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
                <TableHead>{t("screens.backoffice.sales.contacts.customer")}</TableHead>
                <TableHead>{t("screens.backoffice.sales.invoices.posted")}</TableHead>
                <TableHead>{t("screens.backoffice.sales.creditNotes.against")}</TableHead>
                <TableHead className="text-end">{t("screens.backoffice.sales.common.total")}</TableHead>
                <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs" dir="ltr">{c.naming_series ?? shortId(c.id)}</TableCell>
                  <TableCell className="text-sm">{c.customer_name ?? shortId(c.customer_id)}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(c.posting_date, { dateStyle: "medium" })}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{c.return_against ? shortId(c.return_against) : "—"}</TableCell>
                  <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(c.grand_total, c.currency)}</TableCell>
                  <TableCell><DocStatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DataSourceNote command={list.data?.command} />
    </BackOfficePage>
  );
}
