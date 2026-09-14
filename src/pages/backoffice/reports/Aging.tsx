/** BackOffice › Reports › AR / AP Aging (BO-050) — VTID-03858, Read tier: `reports.ar_aging`, `reports.ap_aging` as of today. */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, formatPercent, num } from "@/lib/backoffice-sales";
import { isoDate } from "@/lib/backoffice-accounting";
import { AGING_BUCKETS, agingTotals, overdueShare, type ErpAgingRow, type ErpApAging, type ErpArAging } from "@/lib/backoffice-reports";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["reports.view"] as const;

function AgingTable({ rows, partyLabel, nameOf, emptyKey }: { rows: ErpAgingRow[]; partyLabel: string; nameOf: (r: ErpAgingRow) => string; emptyKey: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t(emptyKey)}</p>;
  const totals = agingTotals(rows);
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{partyLabel}</TableHead>
            {AGING_BUCKETS.map((b) => <TableHead key={b} className="text-end whitespace-nowrap">{t(`screens.backoffice.reports.aging.bucket.${b}`)}</TableHead>)}
            <TableHead className="text-end">{t("screens.backoffice.sales.common.total")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{nameOf(r)}</TableCell>
              {AGING_BUCKETS.map((b) => <TableCell key={b} className={`text-end text-sm whitespace-nowrap ${b !== "current" && b !== "days_30" && num(r[b]) !== 0 ? "text-destructive font-medium" : ""}`}>{num(r[b]) !== 0 ? formatMoney(r[b]) : "—"}</TableCell>)}
              <TableCell className="text-end text-sm font-medium whitespace-nowrap">{formatMoney(r.total)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-medium bg-muted/40">
            <TableCell className="text-sm">{t("screens.backoffice.sales.common.total")}</TableCell>
            {AGING_BUCKETS.map((b) => <TableCell key={b} className="text-end text-sm whitespace-nowrap">{formatMoney(totals[b])}</TableCell>)}
            <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(totals.total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default function BackOfficeAging() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const asOf = isoDate(new Date());
  const ar = useErpRead<ErpArAging>("reports.ar_aging", { as_of_date: asOf }, { enabled });
  const ap = useErpRead<ErpApAging>("reports.ap_aging", { as_of_date: asOf }, { enabled });
  const arRows = ar.data?.result?.customers ?? [];
  const apRows = ap.data?.result?.suppliers ?? [];
  const arShare = overdueShare(arRows);
  const apShare = overdueShare(apRows);

  return (
    <BackOfficePage sectionKey="reports" screenId="BO-050" emoji="⏳" title={t("screens.backoffice.reports.aging.title")} description={t("screens.backoffice.reports.aging.description")} capabilities={CAPS}>
      <p className="text-sm text-muted-foreground">{t("screens.backoffice.reports.aging.asOf", { date: fmtDate(asOf, { dateStyle: "medium" }) })}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.reports.aging.receivables")} value={formatMoney(ar.data?.result?.total_outstanding ?? 0)} subtitle={t("screens.backoffice.reports.aging.receivablesHint", { count: String(arRows.length) })} icon={ArrowDownToLine} loading={enabled && ar.isLoading} variant="success" />
        <AdminStatsCard title={t("screens.backoffice.reports.aging.payables")} value={formatMoney(ap.data?.result?.total_outstanding ?? 0)} subtitle={t("screens.backoffice.reports.aging.payablesHint", { count: String(apRows.length) })} icon={ArrowUpFromLine} loading={enabled && ap.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.reports.aging.overdue")} value={formatMoney(arShare.overdue + apShare.overdue)} subtitle={t("screens.backoffice.reports.aging.overdueHint", { ar: formatPercent(arShare.ratio * 100), ap: formatPercent(apShare.ratio * 100) })} icon={AlertTriangle} loading={enabled && (ar.isLoading || ap.isLoading)} variant={arShare.overdue + apShare.overdue > 0 ? "warning" : "default"} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.reports.aging.arTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: me.isLoading || ar.isLoading, error: ar.error, rows: 3 }) ?? (
            <AgingTable rows={arRows} partyLabel={t("screens.backoffice.reports.aging.customer")} nameOf={(r) => (r as ErpArAging["customers"][number]).customer_name ?? shortId((r as ErpArAging["customers"][number]).customer_id)} emptyKey="screens.backoffice.reports.aging.noAr" />
          )}
          <DataSourceNote command={ar.data?.command} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.reports.aging.apTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {QueryState({ isLoading: me.isLoading || ap.isLoading, error: ap.error, rows: 3 }) ?? (
            <AgingTable rows={apRows} partyLabel={t("screens.backoffice.reports.aging.supplier")} nameOf={(r) => (r as ErpApAging["suppliers"][number]).supplier_name ?? shortId((r as ErpApAging["suppliers"][number]).supplier_id)} emptyKey="screens.backoffice.reports.aging.noAp" />
          )}
          <DataSourceNote command={ap.data?.command} />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t("screens.backoffice.reports.aging.negativeNote")}</p>
    </BackOfficePage>
  );
}
