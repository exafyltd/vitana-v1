import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useOverviewSummary } from "@/hooks/useAdminOverview";
import { useMembers } from "@/hooks/useAdminMembers";
import { useAdminAnalyticsSummary } from "@/hooks/useAdminProductAnalytics";
import { DaysSelect, KpiCard } from "@/components/admin/analytics/AnalyticsShared";
import { BarListCard } from "@/components/admin/analytics/AnalyticsCharts";
import { t } from '@/lib/i18n-toast';

export default function Engagement() {
  const [days, setDays] = useState(30);
  const summaryQuery = useOverviewSummary();
  const membersQuery = useMembers({ limit: 50 });
  // VTID-03567: behavioral engagement from the product analytics pipeline.
  const analyticsQuery = useAdminAnalyticsSummary(days);

  const kpi = summaryQuery.data?.kpi;
  const members = membersQuery.data || [];
  const analytics = analyticsQuery.data;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="💬"
          title={t('screens.admin.engagement')}
          description={t('screens.admin.paEngagementDesc')}
          rightAction={<DaysSelect days={days} onChange={setDays} />}
        />

        {(summaryQuery.isLoading || membersQuery.isLoading) && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingEngagementData')}</p>
        )}

        {kpi && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.totalMembers')}</div>
                <div className="text-3xl font-bold mt-1">{kpi.total_members}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.membersDirectory')}</div>
                <div className="text-3xl font-bold mt-1">{members.length}</div>
                <span className="text-xs text-muted-foreground">{t('screens.admin.loadedFromMemberList')}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.newSignups7d')}</div>
                <div className="text-3xl font-bold mt-1">{kpi.new_signups_7d}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* VTID-03567: real behavioral engagement (replaces the "coming soon" card) */}
        {analytics && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard label={t('screens.admin.paActiveUsers')} value={analytics.active_users} />
              <KpiCard label={t('screens.admin.paSessions')} value={analytics.sessions} />
              <KpiCard label={t('screens.admin.paScreenViews')} value={analytics.screen_views} />
              <KpiCard label={t('screens.admin.paFeatureOpens')} value={analytics.feature_opens} />
            </div>
            <BarListCard
              title={t('screens.admin.paTopRoutes')}
              rows={analytics.top_routes.map((r) => ({ label: r.screen_route, count: r.count }))}
              emptyLabel={t('screens.admin.noAnalyticsData')}
              maxRows={10}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
