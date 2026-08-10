/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: Feature usage analytics
 * (/admin/insights/features).
 *
 * Adoption per feature_key: opens, completions, completion rate, repeat
 * users, assistant-driven opens, daily trends, and a low-adoption list.
 * Data: useAdminFeatureAnalytics. Charted (VTID-03567): daily opens vs
 * completions trend, ranked adoption bars, assisted-vs-direct stacks.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminFeatureAnalytics } from "@/hooks/useAdminProductAnalytics";
import {
  AnalyticsStates,
  DaysSelect,
  KpiCard,
  PrivacyNote,
  pct,
} from "@/components/admin/analytics/AnalyticsShared";
import {
  BarListCard,
  StackedBarListCard,
  TrendChartCard,
} from "@/components/admin/analytics/AnalyticsCharts";
import { fmtNumber, fmtDate } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function Features() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminFeatureAnalytics(days);

  const isEmpty = !!data && data.top_features.length === 0;
  const totals = (data?.top_features ?? []).reduce(
    (acc, f) => ({
      opens: acc.opens + f.opens,
      completions: acc.completions + f.completions,
      repeat: acc.repeat + f.repeat_users,
      assisted: acc.assisted + f.assisted_opens,
    }),
    { opens: 0, completions: 0, repeat: 0, assisted: 0 },
  );
  const lowAdoption = (data?.top_features ?? []).filter((f) => f.opens <= 2).slice(0, 10);

  // Aggregate the per-feature daily trend into one opens/completions series.
  const trendByDate = new Map<string, { opens: number; completions: number }>();
  for (const row of data?.feature_trends ?? []) {
    const entry = trendByDate.get(row.date) ?? { opens: 0, completions: 0 };
    entry.opens += row.opens;
    entry.completions += row.completions;
    trendByDate.set(row.date, entry);
  }
  const trendData = [...trendByDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, counts]) => ({
      label: fmtDate(new Date(date), { month: "short", day: "numeric" }),
      ...counts,
    }));

  const assistedRows = (data?.top_features ?? [])
    .filter((f) => f.opens > 0)
    .map((f) => ({
      label: f.feature_key,
      values: [f.assisted_opens, Math.max(0, f.opens - f.assisted_opens)],
    }));

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="🧩"
          title={t("screens.admin.paFeatureUsage")}
          description={t("screens.admin.paFeaturesDesc")}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label={t("screens.admin.paFeaturesOpened")} value={totals.opens} />
              <KpiCard label={t("screens.admin.paFeatureCompletions")} value={totals.completions} />
              <KpiCard label={t("screens.admin.paRepeatUsers")} value={totals.repeat} />
              <KpiCard label={t("screens.admin.paAssistantDrivenOpens")} value={totals.assisted} />
            </div>

            <TrendChartCard
              title={t("screens.admin.paOpensVsCompletions")}
              data={trendData}
              xKey="label"
              series={[
                { key: "opens", label: t("screens.admin.paOpens") },
                { key: "completions", label: t("screens.admin.paCompletions") },
              ]}
              emptyLabel={t("screens.admin.noAnalyticsData")}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <BarListCard
                title={t("screens.admin.paTopFeatures")}
                rows={data.top_features.map((f) => ({
                  label: f.feature_key,
                  count: f.opens,
                  extra: (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {t("screens.admin.paCompletionRate")}: {pct(f.completion_rate)}
                    </Badge>
                  ),
                }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <StackedBarListCard
                title={t("screens.admin.paAssistedVsDirect")}
                rows={assistedRows}
                series={[
                  { key: "assisted", label: t("screens.admin.paAssisted") },
                  { key: "direct", label: t("screens.admin.paDirect") },
                ]}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            {/* Low adoption */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paLowAdoption")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {lowAdoption.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">{t("screens.admin.noAnalyticsData")}</p>
                ) : (
                  <div className="space-y-1">
                    {lowAdoption.map((f) => (
                      <div
                        key={f.feature_key}
                        className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                      >
                        <span className="font-mono">{f.feature_key}</span>
                        <Badge variant="outline">
                          {t("screens.admin.paOpens")}: {fmtNumber(f.opens)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
