/**
 * BOOTSTRAP-PRODUCT-ANALYTICS: Journey analytics (/admin/insights/journeys).
 *
 * Entry/exit routes, top paths, drop-off screens, and assistant→feature
 * attribution, aggregated per session from the clickstream
 * (useAdminJourneyAnalytics). Charted (VTID-03567): ranked entry/exit and
 * drop-off bars, assisted-vs-direct stacks.
 */

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminJourneyAnalytics } from "@/hooks/useAdminProductAnalytics";
import {
  AnalyticsStates,
  DaysSelect,
  KpiCard,
  PrivacyNote,
  pct,
} from "@/components/admin/analytics/AnalyticsShared";
import { BarListCard, StackedBarListCard } from "@/components/admin/analytics/AnalyticsCharts";
import { fmtNumber } from "@/lib/locale-format";
import { t } from "@/lib/i18n-toast";

export default function Journeys() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminJourneyAnalytics(days);

  const isEmpty = !!data && data.sessions === 0;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="🧭"
          title={t("screens.admin.paUserJourneys")}
          description={t("screens.admin.paJourneysDesc")}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label={t("screens.admin.paSessions")} value={data.sessions} />
              <KpiCard label={t("screens.admin.paScreenViews")} value={data.screen_views} />
              <KpiCard label={t("screens.admin.paAvgScreensPerSession")} value={fmtNumber(data.avg_screens_per_session)} />
              <KpiCard label={t("screens.admin.paDropoffScreens")} value={data.dropoffs.length} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <BarListCard
                title={t("screens.admin.paTopEntryRoutes")}
                rows={data.top_entry_routes.map((r) => ({ label: r.screen_route, count: r.sessions }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <BarListCard
                title={t("screens.admin.paTopExitRoutes")}
                colorIndex={1}
                rows={data.top_exit_routes.map((r) => ({ label: r.screen_route, count: r.sessions }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            {/* Top paths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("screens.admin.paTopPaths")}</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[60vh] overflow-y-auto">
                {data.top_paths.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">{t("screens.admin.noAnalyticsData")}</p>
                ) : (
                  <div className="space-y-1">
                    {data.top_paths.map((p) => (
                      <div
                        key={p.path.join(">")}
                        className="flex items-center justify-between gap-3 rounded border px-2 py-1.5 text-sm"
                      >
                        <span className="truncate font-mono text-xs">{p.path.join(" → ")}</span>
                        <Badge variant="secondary">{fmtNumber(p.sessions)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <BarListCard
                title={t("screens.admin.paDropoffScreens")}
                colorIndex={7}
                rows={data.dropoffs.map((d) => ({
                  label: d.screen_route,
                  count: d.exits,
                  extra: (
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {t("screens.admin.paExitRate")}: {pct(d.exit_rate)}
                    </Badge>
                  ),
                }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
              <StackedBarListCard
                title={t("screens.admin.paAssistantToFeature")}
                rows={data.assistant_to_feature.map((f) => ({
                  label: f.feature_key,
                  values: [f.assisted_opens, f.direct_opens],
                }))}
                series={[
                  { key: "assisted", label: t("screens.admin.paAssistedOpens") },
                  { key: "direct", label: t("screens.admin.paDirectOpens") },
                ]}
                emptyLabel={t("screens.admin.noAnalyticsData")}
              />
            </div>

            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
