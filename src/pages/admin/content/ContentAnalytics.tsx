import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContentStats } from "@/hooks/useAdminContent";
import { t } from '@/lib/i18n-toast';

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  flagged: "bg-orange-100 text-orange-800",
};

export default function ContentAnalytics() {
  const { data: stats, isLoading } = useContentStats();

  return (
    <AppLayout>
      <AdminTabs sectionKey="content" />
      <div className="p-6 space-y-6">
        <AdminHeader
          emoji="📈"
          title={t('screens.admin.contentAnalytics')}
          description="Overview of content submissions and moderation status"
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('screens.admin.loadingAnalytics')}</p>
        ) : !stats ? (
          <AdminEmptyState title={t('screens.admin.noAnalyticsAvailable')} description="Content stats could not be loaded." />
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.admin.totalItems')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-sm font-semibold mb-3">{t('screens.admin.byStatus')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_status).map(([status, count]) => (
                  <Card key={status}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{status}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <span className={`inline-block rounded-full px-3 py-1 text-lg font-bold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-800"}`}>
                        {count}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">{t('screens.admin.byType')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_type).map(([type, count]) => (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{count}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
