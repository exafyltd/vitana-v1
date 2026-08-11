/**
 * VTID-03567: Product analytics overview (/admin/insights/overview).
 *
 * At-a-glance landing page for the Insights section: the /summary KPI grid
 * plus ranked top-routes/features/interests bars, each linking to its
 * detail screen. Data: useAdminAnalyticsSummary.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { useAdminAnalyticsSummary } from "@/hooks/useAdminProductAnalytics";
import {
  AnalyticsStates,
  DaysSelect,
  KpiCard,
  PrivacyNote,
} from "@/components/admin/analytics/AnalyticsShared";
import { BarListCard } from "@/components/admin/analytics/AnalyticsCharts";
import { t } from "@/lib/i18n-toast";

function DetailLink({ to }: { to: string }) {
  return (
    <Link to={to} className="text-xs font-medium text-primary hover:underline">
      {t("screens.admin.paViewDetails")}
    </Link>
  );
}

export default function Overview() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useAdminAnalyticsSummary(days);

  const isEmpty = !!data && data.sessions === 0 && data.screen_views === 0;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="📊"
          title={t("screens.admin.paOverview")}
          description={t("screens.admin.paOverviewDesc")}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        <AnalyticsStates isLoading={isLoading} error={error} isEmpty={isEmpty} />

        {data && !isEmpty && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label={t("screens.admin.paActiveUsers")} value={data.active_users} />
              <KpiCard label={t("screens.admin.paSessions")} value={data.sessions} />
              <KpiCard label={t("screens.admin.paScreenViews")} value={data.screen_views} />
              <KpiCard label={t("screens.admin.paConversations")} value={data.assistant_conversations} />
              <KpiCard label={t("screens.admin.paMessages")} value={data.assistant_messages} />
              <KpiCard label={t("screens.admin.paFeaturesOpened")} value={data.feature_opens} />
              <KpiCard label={t("screens.admin.paRecommendationClicks")} value={data.recommendation_clicks} />
              <KpiCard label={t("screens.admin.paUnresolvedConversations")} value={data.unresolved_conversations} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <BarListCard
                title={t("screens.admin.paTopRoutes")}
                rows={data.top_routes.map((r) => ({ label: r.screen_route, count: r.count }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
                maxRows={10}
                action={<DetailLink to="/admin/insights/journeys" />}
              />
              <BarListCard
                title={t("screens.admin.paTopFeatures")}
                colorIndex={2}
                rows={data.top_features.map((f) => ({ label: f.feature_key, count: f.count }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
                maxRows={10}
                action={<DetailLink to="/admin/insights/features" />}
              />
              <BarListCard
                title={t("screens.admin.paTopTopics")}
                colorIndex={4}
                rows={data.top_interests.map((i) => ({ label: i.topic, count: i.count }))}
                emptyLabel={t("screens.admin.noAnalyticsData")}
                maxRows={10}
                action={<DetailLink to="/admin/insights/interests" />}
              />
            </div>

            <PrivacyNote />
          </>
        )}
      </div>
    </AppLayout>
  );
}
