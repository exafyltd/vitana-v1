import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverviewSummary } from "@/hooks/useAdminOverview";
import { useMembers } from "@/hooks/useAdminMembers";
import { t } from '@/lib/i18n-toast';

export default function Engagement() {
  const summaryQuery = useOverviewSummary();
  const membersQuery = useMembers({ limit: 50 });

  const kpi = summaryQuery.data?.kpi;
  const members = membersQuery.data || [];

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="💬"
          title={t('screens.admin.engagement')}
          description="Member activity and engagement metrics"
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('screens.admin.deepEngagementAnalytics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              Deep engagement analytics coming soon — session duration, feature usage heatmaps,
              retention cohorts, and churn prediction.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
