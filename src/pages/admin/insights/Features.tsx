/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: Feature usage analytics
 * (/admin/insights/features).
 *
 * Adoption per feature_key: opens, completions, completion rate, repeat
 * users, assistant-driven opens, daily trends, and a low-adoption list.
 * Data: useAdminFeatureAnalytics.
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
  // Show the most recent days of the per-feature trend, newest first.
  const recentTrends = [...(data?.feature_trends ?? [])].reverse().slice(0, 40);

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

            {/* Top features table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paTopFeatures")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                <div className="space-y-1">
                  {data.top_features.map((f) => (
                    <div
                      key={f.feature_key}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm"
                    >
                      <span className="truncate font-mono">{f.feature_key}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">
                          {t("screens.admin.paOpens")}: {fmtNumber(f.opens)}
                        </Badge>
                        <Badge variant="secondary">
                          {t("screens.admin.paCompletions")}: {fmtNumber(f.completions)}
                        </Badge>
                        <Badge variant="outline">
                          {t("screens.admin.paCompletionRate")}: {pct(f.completion_rate)}
                        </Badge>
                        <Badge variant="outline">
                          {t("screens.admin.paRepeatUsers")}: {fmtNumber(f.repeat_users)}
                        </Badge>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              {/* Daily trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("screens.admin.paFeatureTrends")}</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  {recentTrends.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">{t("screens.admin.noAnalyticsData")}</p>
                  ) : (
                    <div className="space-y-1">
                      {recentTrends.map((row) => (
                        <div
                          key={`${row.date}-${row.feature_key}`}
                          className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-sm"
                        >
                          <span className="text-xs text-muted-foreground">{fmtDate(new Date(row.date))}</span>
                          <span className="flex-1 truncate px-2 font-mono text-xs">{row.feature_key}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <Badge variant="secondary">
                              {t("screens.admin.paOpens")}: {fmtNumber(row.opens)}
                            </Badge>
                            <Badge variant="outline">
                              {t("screens.admin.paCompletions")}: {fmtNumber(row.completions)}
                            </Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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
            </div>

            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
