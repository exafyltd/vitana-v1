/** BackOffice › Reports › P&L (BO-046) — VTID-03858, Read tier: `reports.pnl` over a preset date window. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import QueryState from "@/components/backoffice/QueryState";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Percent, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, formatPercent, num } from "@/lib/backoffice-sales";
import { REPORT_PRESETS, netMargin, presetWindow, sortByAmountDesc, type ErpPnl, type ErpPnlLine, type ReportPreset } from "@/lib/backoffice-reports";
import { fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["reports.view"] as const;

function LinesTable({ lines, total, title, emptyKey }: { lines: ErpPnlLine[]; total: string | number; title: string; emptyKey: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {lines.length === 0 ? <p className="text-sm text-muted-foreground">{t(emptyKey)}</p> : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("screens.backoffice.accounting.common.account")}</TableHead>
                  <TableHead className="text-end">{t("screens.backoffice.reports.pnl.amount")}</TableHead>
                  <TableHead className="text-end">{t("screens.backoffice.reports.pnl.share")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortByAmountDesc(lines).map((l) => (
                  <TableRow key={l.account_id}>
                    <TableCell className="text-sm">{l.account}</TableCell>
                    <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(l.amount)}</TableCell>
                    <TableCell className="text-end text-xs text-muted-foreground whitespace-nowrap">{num(total) !== 0 ? formatPercent((num(l.amount) / num(total)) * 100) : "—"}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-medium bg-muted/40">
                  <TableCell className="text-sm">{t("screens.backoffice.sales.common.total")}</TableCell>
                  <TableCell className="text-end text-sm whitespace-nowrap">{formatMoney(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BackOfficeProfitAndLoss() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [preset, setPreset] = useState<ReportPreset>("ytd");
  const window = presetWindow(preset);
  const pnl = useErpRead<ErpPnl>("reports.pnl", window, { enabled });
  const r = pnl.data?.result;
  const margin = r ? netMargin(r) : null;
  const net = num(r?.net_income ?? 0);

  return (
    <BackOfficePage sectionKey="reports" screenId="BO-046" emoji="📈" title={t("screens.backoffice.reports.pnl.title")} description={t("screens.backoffice.reports.pnl.description")} capabilities={CAPS}>
      <div className="flex flex-wrap items-center gap-3">
        <Select value={preset} onValueChange={(v) => setPreset(v as ReportPreset)}>
          <SelectTrigger className="w-56" aria-label={t("screens.backoffice.reports.common.period")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_PRESETS.map((p) => <SelectItem key={p} value={p}>{t(`screens.backoffice.reports.common.preset.${p}`)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" dir="auto">{t("screens.backoffice.reports.common.window", { from: fmtDate(window.from_date, { dateStyle: "medium" }), to: fmtDate(window.to_date, { dateStyle: "medium" }) })}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatsCard title={t("screens.backoffice.reports.pnl.income")} value={formatMoney(r?.income_total ?? 0)} subtitle={t("screens.backoffice.reports.pnl.incomeHint", { count: String((r?.income ?? []).length) })} icon={TrendingUp} loading={enabled && pnl.isLoading} variant="success" />
        <AdminStatsCard title={t("screens.backoffice.reports.pnl.expenses")} value={formatMoney(r?.expense_total ?? 0)} subtitle={t("screens.backoffice.reports.pnl.expensesHint", { count: String((r?.expenses ?? []).length) })} icon={TrendingDown} loading={enabled && pnl.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.reports.pnl.netIncome")} value={formatMoney(net)} subtitle={t(net >= 0 ? "screens.backoffice.reports.pnl.profit" : "screens.backoffice.reports.pnl.loss")} icon={Wallet} loading={enabled && pnl.isLoading} variant={net >= 0 ? "success" : "error"} />
        <AdminStatsCard title={t("screens.backoffice.reports.pnl.margin")} value={margin === null ? "—" : formatPercent(margin * 100)} subtitle={t("screens.backoffice.reports.pnl.marginHint")} icon={Percent} loading={enabled && pnl.isLoading} />
      </div>
      {QueryState({ isLoading: me.isLoading || pnl.isLoading, error: pnl.error, isEmpty: !r, emptyTitle: t("screens.backoffice.reports.pnl.empty"), rows: 6 }) ?? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LinesTable lines={r!.income} total={r!.income_total} title={t("screens.backoffice.reports.pnl.incomeTitle")} emptyKey="screens.backoffice.reports.pnl.noIncome" />
          <LinesTable lines={r!.expenses} total={r!.expense_total} title={t("screens.backoffice.reports.pnl.expensesTitle")} emptyKey="screens.backoffice.reports.pnl.noExpenses" />
        </div>
      )}
      <DataSourceNote command={pnl.data?.command} />
    </BackOfficePage>
  );
}
