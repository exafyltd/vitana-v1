import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverviewSummary } from "@/hooks/useAdminOverview";
import { useSignupReport } from "@/hooks/useAdminInsights";
import { t } from '@/lib/i18n-toast';

export default function Growth() {
  const summaryQuery = useOverviewSummary();
  const signupQuery = useSignupReport();

  const kpi = summaryQuery.data?.kpi;
  const roles = summaryQuery.data?.role_distribution || {};
  const signup = signupQuery.data;

  return (
    <AppLayout>
      <AdminTabs sectionKey="insights" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="🌱"
          title={t('screens.admin.growth')}
          description="Member growth KPIs and signup trends"
        />

        {summaryQuery.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingGrowthData')}</p>
        )}

        {kpi && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.totalMembers')}</div>
                  <div className="text-3xl font-bold mt-1">{kpi.total_members}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.newSignups7d')}</div>
                  <div className="text-3xl font-bold mt-1">{kpi.new_signups_7d}</div>
                  <span className={`text-xs ${kpi.new_signups_delta_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {kpi.new_signups_delta_pct >= 0 ? "+" : ""}{kpi.new_signups_delta_pct}% vs prior week
                  </span>
                </CardContent>
              </Card>
              {signup && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">{t('screens.admin.totalSignupsAllTime')}</div>
                    <div className="text-3xl font-bold mt-1">{signup.total}</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Role Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('screens.admin.roleDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(roles)
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => {
                      const total = Object.values(roles).reduce((s, c) => s + c, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={role} className="flex items-center gap-3">
                          <AdminStatusBadge
                            variant={role === "admin" ? "error" : role === "staff" ? "warning" : "info"}
                          >
                            {role}
                          </AdminStatusBadge>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
