/** BackOffice › Accounting › Fiscal Periods & Close (BO-020) — VTID-03857, Read tier: `accounting.period.list`, `accounting.period.validate`, `accounting.gl.integrity_check`, `accounting.cost_center.list`. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DetailList from "@/components/backoffice/DetailList";
import QueryState from "@/components/backoffice/QueryState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarRange, Link2, Scale } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney } from "@/lib/backoffice-sales";
import { defaultFiscalYear, fiscalYearState, flag, type ErpCostCenter, type ErpFiscalYear, type ErpGlIntegrity, type ErpPeriodValidation } from "@/lib/backoffice-accounting";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["accounting.view"] as const;
const STATE_VARIANT = { closed: "inactive", current: "active", past: "warning", future: "info" } as const;

export default function BackOfficePeriods() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const [picked, setPicked] = useState<string | null>(null);
  const years = useErpRead<{ fiscal_years?: ErpFiscalYear[] }>("accounting.period.list", {}, { enabled });
  const integrity = useErpRead<ErpGlIntegrity>("accounting.gl.integrity_check", {}, { enabled });
  const costCenters = useErpRead<{ cost_centers?: ErpCostCenter[] }>("accounting.cost_center.list", {}, { enabled });
  const all = years.data?.result?.fiscal_years ?? [];
  const selected = all.find((y) => y.id === picked) ?? defaultFiscalYear(all);
  const validation = useErpRead<ErpPeriodValidation>("accounting.period.validate", { fiscal_year_id: selected?.id ?? "" }, { enabled: enabled && !!selected });
  const g = integrity.data?.result;
  const v = validation.data?.result;
  const openCount = all.filter((y) => !flag(y.is_closed)).length;

  return (
    <BackOfficePage sectionKey="accounting" screenId="BO-020" emoji="🗓️" title={t("screens.backoffice.accounting.periods.title")} description={t("screens.backoffice.accounting.periods.description")} capabilities={CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminStatsCard title={t("screens.backoffice.accounting.periods.years")} value={fmtNumber(all.length)} subtitle={t("screens.backoffice.accounting.periods.yearsHint", { open: fmtNumber(openCount) })} icon={CalendarRange} loading={enabled && years.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.accounting.periods.glBalance")} value={g ? (g.balanced ? t("screens.backoffice.accounting.common.balanced") : t("screens.backoffice.accounting.common.unbalanced")) : "—"} subtitle={g ? t("screens.backoffice.accounting.periods.glHint", { difference: formatMoney(g.difference) }) : ""} icon={Scale} loading={enabled && integrity.isLoading} variant={g ? (g.balanced ? "success" : "error") : "default"} />
        <AdminStatsCard title={t("screens.backoffice.accounting.periods.chain")} value={g ? (g.chain_intact ? t("screens.backoffice.accounting.periods.chainIntact") : t("screens.backoffice.accounting.periods.chainBroken")) : "—"} subtitle={g ? t("screens.backoffice.accounting.periods.chainHint", { broken: fmtNumber(g.broken_links), total: fmtNumber(g.total_entries) }) : ""} icon={Link2} loading={enabled && integrity.isLoading} variant={g ? (g.chain_intact ? "success" : "warning") : "default"} />
      </div>
      {integrity.error && <QueryState isLoading={false} error={integrity.error} />}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-2">
          {QueryState({ isLoading: me.isLoading || years.isLoading, error: years.error, isEmpty: all.length === 0, emptyTitle: t("screens.backoffice.accounting.periods.empty") }) ?? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("screens.backoffice.accounting.periods.name")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.periods.start")}</TableHead>
                    <TableHead>{t("screens.backoffice.accounting.periods.end")}</TableHead>
                    <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {all.map((y) => {
                    const state = fiscalYearState(y);
                    return (
                      <TableRow key={y.id} onClick={() => setPicked(y.id)} className={`cursor-pointer ${selected?.id === y.id ? "bg-muted/60" : ""}`} aria-selected={selected?.id === y.id}>
                        <TableCell className="text-sm font-medium">{y.name}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(y.start_date, { dateStyle: "medium" })}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(y.end_date, { dateStyle: "medium" })}</TableCell>
                        <TableCell><AdminStatusBadge variant={STATE_VARIANT[state]} className="whitespace-nowrap">{t(`screens.backoffice.accounting.periods.state.${state}`)}</AdminStatusBadge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DataSourceNote command={years.data?.command} />
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.accounting.periods.costCenters")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {QueryState({ isLoading: me.isLoading || costCenters.isLoading, error: costCenters.error, isEmpty: (costCenters.data?.result?.cost_centers?.length ?? 0) === 0, emptyTitle: t("screens.backoffice.accounting.periods.noCostCenters"), rows: 2 }) ?? (
                <ul className="text-sm space-y-1">
                  {(costCenters.data?.result?.cost_centers ?? []).map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <span>{c.name}</span>
                      {flag(c.is_group) && <AdminStatusBadge variant="info" className="whitespace-nowrap">{t("screens.backoffice.accounting.coa.group")}</AdminStatusBadge>}
                    </li>
                  ))}
                </ul>
              )}
              <DataSourceNote command={costCenters.data?.command} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.accounting.periods.readiness")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("screens.backoffice.accounting.periods.readinessHint")}</p>
            {!selected ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.accounting.periods.selectYear")}</p> : (
              QueryState({ isLoading: validation.isLoading, error: validation.error, isEmpty: !v, emptyTitle: t("screens.backoffice.errors.notFound"), rows: 4 }) ?? (
                <DetailList rows={[
                  { label: t("screens.backoffice.accounting.periods.fiscalYear"), value: v!.fiscal_year ?? selected.name },
                  { label: t("screens.backoffice.accounting.periods.income"), value: formatMoney(v!.income_total) },
                  { label: t("screens.backoffice.accounting.periods.expense"), value: formatMoney(v!.expense_total) },
                  { label: t("screens.backoffice.accounting.periods.netIncome"), value: <span className="font-medium">{formatMoney(v!.net_income)}</span> },
                  { label: t("screens.backoffice.accounting.periods.trialBalance"), value: <AdminStatusBadge variant={v!.trial_balance_balanced ? "active" : "error"} className="whitespace-nowrap">{v!.trial_balance_balanced ? t("screens.backoffice.accounting.common.balanced") : t("screens.backoffice.accounting.common.unbalanced")}</AdminStatusBadge> },
                ]} />
              )
            )}
            {selected && <p className="text-sm">{t("screens.backoffice.accounting.periods.selectedYear", { name: selected.name })}</p>}
            <p className="text-xs text-muted-foreground border-t pt-2">{t("screens.backoffice.accounting.periods.closeNote")}</p>
            {selected && <DataSourceNote command={validation.data?.command} />}
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
