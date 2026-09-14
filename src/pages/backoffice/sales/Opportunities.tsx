/** BackOffice › Sales & CRM › Opportunities (BO-007) — VTID-03855, Read tier: pipeline report + board by stage. */
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Trophy, XCircle, Percent } from "lucide-react";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, formatPercent, groupOpportunitiesByStage, type ErpOpportunity, type ErpPipelineReport } from "@/lib/backoffice-sales";
import { fmtDate, fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

const CAPS = ["crm.view"] as const;

export default function BackOfficeOpportunities() {
  const me = useMyErpAccess();
  const enabled = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, CAPS));
  const report = useErpRead<ErpPipelineReport>("crm.pipeline.report", {}, { enabled });
  const opps = useErpRead<{ opportunities?: ErpOpportunity[] }>("crm.opportunity.list", { limit: 200 }, { enabled });
  const p = report.data?.result?.pipeline;
  const columns = groupOpportunitiesByStage(report.data?.result, opps.data?.result?.opportunities ?? []);

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-007" emoji="📈" title={t("screens.backoffice.sales.opportunities.title")} description={t("screens.backoffice.sales.opportunities.description")} capabilities={CAPS}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatsCard title={t("screens.backoffice.sales.opportunities.open")} value={fmtNumber(p?.total_opportunities ?? 0)} subtitle={t("screens.backoffice.sales.opportunities.openHint")} icon={Target} loading={enabled && report.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.sales.opportunities.won")} value={fmtNumber(p?.total_won ?? 0)} subtitle={t("screens.backoffice.sales.opportunities.wonHint")} icon={Trophy} loading={enabled && report.isLoading} variant="success" />
        <AdminStatsCard title={t("screens.backoffice.sales.opportunities.lost")} value={fmtNumber(p?.total_lost ?? 0)} subtitle={t("screens.backoffice.sales.opportunities.lostHint")} icon={XCircle} loading={enabled && report.isLoading} />
        <AdminStatsCard title={t("screens.backoffice.sales.opportunities.conversion")} value={formatPercent(p?.conversion_rate_pct ?? 0)} subtitle={t("screens.backoffice.sales.opportunities.conversionHint")} icon={Percent} loading={enabled && report.isLoading} />
      </div>
      {QueryState({ isLoading: me.isLoading || report.isLoading || opps.isLoading, error: report.error ?? opps.error, isEmpty: columns.length === 0, emptyTitle: t("screens.backoffice.sales.opportunities.empty"), emptyDescription: t("screens.backoffice.sales.opportunities.emptyHint") }) ?? (
        <div className="flex gap-4 overflow-x-auto pb-2" role="list" aria-label={t("screens.backoffice.sales.opportunities.board")}>
          {columns.map((col) => (
            <Card key={col.stage} className="min-w-[280px] w-[280px] shrink-0" role="listitem">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span>{col.stage}</span>
                  <span className="text-xs font-normal text-muted-foreground">{fmtNumber(col.count)}</span>
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  {t("screens.backoffice.sales.opportunities.expected")}: {formatMoney(col.expected)} · {t("screens.backoffice.sales.opportunities.weighted")}: {formatMoney(col.weighted)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {col.opportunities.length === 0 && <p className="text-xs text-muted-foreground">{t("screens.backoffice.sales.opportunities.noneInStage")}</p>}
                {col.opportunities.map((o) => (
                  <div key={o.id} className="rounded-md border p-3 space-y-1 bg-background">
                    <div className="text-sm font-medium">{o.opportunity_name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{o.naming_series ?? shortId(o.id)}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span>{formatMoney(o.expected_revenue)}</span>
                      <span className="text-muted-foreground">{formatPercent(o.probability)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{o.expected_closing_date ? fmtDate(o.expected_closing_date, { dateStyle: "medium" }) : "—"}</span>
                      {o.lost_reason ? <DocStatusBadge status="lost" /> : o.source ? <span>{o.source}</span> : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <DataSourceNote command={report.data?.command ?? opps.data?.command} />
    </BackOfficePage>
  );
}
