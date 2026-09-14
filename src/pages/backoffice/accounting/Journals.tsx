/** BackOffice › Accounting › Journals (BO-018) — VTID-03857 Read tier; VTID-03872 journal Draft card: `accounting.journal.list`, `accounting.journal.get`. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpenText, FileEdit, Scale, Sigma } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch } from "@/lib/backoffice-sales";
import { isBalancedEntry, journalLineTotals, summarizeJournals, type ErpJournalDetail, type ErpJournalRow } from "@/lib/backoffice-accounting";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";
import { DraftCommandButton } from "@/components/backoffice/DraftCommandDialog";
import { canCancelJournal, canSubmitJournal } from "@/lib/backoffice-draft";

const CAPS = ["accounting.view"] as const;

export default function BackOfficeJournals() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useErpRead<{ entries?: ErpJournalRow[] }>("accounting.journal.list", { limit: 100 }, { enabled });
  const detail = useErpRead<ErpJournalDetail>("accounting.journal.get", { journal_entry_id: selected ?? "" }, { enabled: enabled && !!selected });
  const all = list.data?.result?.entries ?? [];
  const summary = summarizeJournals(all);
  const rows = all.filter((e) => (status === "all" || String(e.status).toLowerCase() === status) && fullTextMatch(search, e.naming_series, e.remark, e.entry_type, e.status));
  const listRow = all.find((e) => e.id === selected);
  const d = detail.data?.result;
  const lineTotals = d ? journalLineTotals(d.lines ?? []) : null;
  const statusOptions = ["all", "draft", "submitted", "cancelled"].map((v) => ({ value: v, label: v === "all" ? t("screens.backoffice.common.all") : t(`screens.backoffice.sales.status.${v}`) }));

  return (
    <BackOfficePage sectionKey="accounting" screenId="BO-018" emoji="📒" title={t("screens.backoffice.accounting.journals.title")} description={t("screens.backoffice.accounting.journals.description")} capabilities={CAPS} rightAction={<DraftCommandButton formId="journal" />}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatsCard title={t("screens.backoffice.accounting.journals.entries")} value={fmtNumber(summary.total)} subtitle={t("screens.backoffice.accounting.journals.entriesHint", { submitted: fmtNumber(summary.submitted), cancelled: fmtNumber(summary.cancelled) })} icon={BookOpenText} loading={enabled && list.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.accounting.journals.posted")} value={formatMoney(summary.postedDebit)} subtitle={t("screens.backoffice.accounting.journals.postedHint")} icon={Sigma} loading={enabled && list.isLoading} variant="success" />
        <AdminStatsCard title={t("screens.backoffice.accounting.journals.drafts")} value={fmtNumber(summary.drafts)} subtitle={t("screens.backoffice.accounting.journals.draftsHint")} icon={FileEdit} loading={enabled && list.isLoading} variant={summary.drafts > 0 ? "warning" : "default"} />
        <AdminStatsCard title={t("screens.backoffice.accounting.journals.unbalanced")} value={fmtNumber(summary.unbalanced)} subtitle={t("screens.backoffice.accounting.journals.unbalancedHint")} icon={Scale} loading={enabled && list.isLoading} variant={summary.unbalanced > 0 ? "error" : "success"} />
      </div>
      <AdminFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("screens.backoffice.accounting.journals.searchPlaceholder")}
        filters={[{ value: status, onChange: setStatus, placeholder: t("screens.backoffice.sales.common.status"), options: statusOptions }]}
        onReset={() => { setSearch(""); setStatus("all"); }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || list.isLoading, error: list.error, isEmpty: rows.length === 0, emptyTitle: t("screens.backoffice.accounting.journals.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.sales.common.reference")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.date")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.journals.type")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.accounting.common.debit")}</TableHead>
                    <TableHead className="text-end">{t("screens.backoffice.accounting.common.credit")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.journals.remark")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id} onClick={() => setSelected(e.id)} className={`cursor-pointer ${selected === e.id ? "bg-muted/60" : ""}`} aria-selected={selected === e.id}>
                      <TableCell className="font-mono text-xs" dir="ltr">{e.naming_series ?? shortId(e.id)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(e.posting_date, { dateStyle: "medium" })}</TableCell>
                      <TableCell className="text-xs">{e.entry_type ?? "—"}</TableCell>
                      <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(e.total_debit)}</TableCell>
                      <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(e.total_credit)}</TableCell>
                      <TableCell className="text-sm max-w-[16rem] truncate" title={e.remark ?? undefined}>{e.remark ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DocStatusBadge status={e.status} />
                          {!isBalancedEntry(e) && <AdminStatusBadge variant="error" className="whitespace-nowrap">{t("screens.backoffice.accounting.common.unbalanced")}</AdminStatusBadge>}
                        </div>
                      </TableCell>
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
                    { label: t("screens.backoffice.sales.common.date"), value: fmtDate(d!.posting_date, { dateStyle: "medium" }) },
                    { label: t("screens.backoffice.accounting.journals.type"), value: d!.entry_type ?? "—" },
                    { label: t("screens.backoffice.sales.common.status"), value: <DocStatusBadge status={listRow?.status ?? "draft"} /> },
                    { label: t("screens.backoffice.accounting.common.balanced"), value: <AdminStatusBadge variant={isBalancedEntry(d!) ? "active" : "error"} className="whitespace-nowrap">{isBalancedEntry(d!) ? t("screens.backoffice.accounting.common.balanced") : t("screens.backoffice.accounting.common.unbalanced")}</AdminStatusBadge> },
                    { label: t("screens.backoffice.accounting.journals.remark"), value: d!.remark ?? "—" },
                    { label: t("screens.backoffice.accounting.journals.amendedFrom"), value: d!.amended_from ? shortId(d!.amended_from) : "—", mono: true },
                  ]} />
                  {/* VTID-03888 — posting a draft entry is Commit tier (explicit confirmation); cancelling a posted one is High-risk and goes to a second approver with accounting.close. */}
                  {(canSubmitJournal(listRow) || canCancelJournal(listRow)) && (
                    <div className="pt-2 border-t flex flex-wrap gap-1">
                      {canSubmitJournal(listRow) && <DraftCommandButton formId="journalSubmit" initial={{ journal_entry_id: d!.id }} />}
                      {canCancelJournal(listRow) && <DraftCommandButton formId="journalCancel" variant="outline" initial={{ journal_entry_id: d!.id }} />}
                    </div>
                  )}
                  <h3 className="text-sm font-medium pt-2">{t("screens.backoffice.accounting.journals.lines", { count: fmtNumber((d!.lines ?? []).length) })}</h3>
                  {(d!.lines ?? []).length === 0 ? <p className="text-xs text-muted-foreground">{t("screens.backoffice.accounting.journals.noLines")}</p> : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("screens.backoffice.accounting.common.account")}</TableHead>
                            <TableHead className="text-end">{t("screens.backoffice.accounting.common.debit")}</TableHead>
                            <TableHead className="text-end">{t("screens.backoffice.accounting.common.credit")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {d!.lines.map((l) => (
                            <TableRow key={l.id}>
                              <TableCell className="text-xs">
                                <div>{l.account_name ?? shortId(l.account_id)}</div>
                                {l.remark && <div className="text-[11px] text-muted-foreground">{l.remark}</div>}
                              </TableCell>
                              <TableCell className="text-end text-xs whitespace-nowrap">{formatMoney(l.debit)}</TableCell>
                              <TableCell className="text-end text-xs whitespace-nowrap">{formatMoney(l.credit)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-medium bg-muted/40">
                            <TableCell className="text-xs">{t("screens.backoffice.sales.common.total")}</TableCell>
                            <TableCell className="text-end text-xs whitespace-nowrap">{formatMoney(lineTotals!.debit)}</TableCell>
                            <TableCell className="text-end text-xs whitespace-nowrap">{formatMoney(lineTotals!.credit)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
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
