import { Bell, BellOff, Moon, BarChart3, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { adminNotificationsNavigation } from "@/config/navigation";
import { useNotificationPreferenceStats } from "@/hooks/useAdminNotifications";
import { t } from '@/lib/i18n-toast';

const CATEGORY_LABELS: Record<string, string> = {
  live_room_notifications: "Live Room",
  match_notifications: "Matching",
  recommendation_notifications: "Recommendations",
  task_notifications: "Tasks",
  community_notifications: "Community",
  memory_notifications: "Memory & Diary",
};

export default function NotificationPreferences() {
  const { data, isLoading } = useNotificationPreferenceStats();

  const stats = data?.stats;
  const delivery = data?.delivery;
  const totalWithPrefs = stats?.total_users_with_prefs || 0;

  const pushRate = totalWithPrefs
    ? Math.round(((stats?.push_enabled || 0) / totalWithPrefs) * 100)
    : 0;

  return (
    <AppLayout>
      <SubNavigation items={adminNotificationsNavigation} />
      <div className="p-6 space-y-6">
        <AdminHeader
          title={t('screens.admin.notificationPreferences')}
          description="Aggregate view of user notification opt-in rates and engagement"
        />

        {/* Top stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard
            title={t('screens.admin.usersWithPreferences')}
            value={totalWithPrefs}
            icon={Users}
            loading={isLoading}
          />
          <AdminStatsCard
            title={t('screens.admin.pushEnabled')}
            value={`${pushRate}%`}
            subtitle={`${stats?.push_enabled || 0} of ${totalWithPrefs}`}
            icon={Bell}
            loading={isLoading}
            variant={pushRate > 50 ? "success" : "warning"}
          />
          <AdminStatsCard
            title={t('screens.admin.dndActive')}
            value={stats?.dnd_enabled || 0}
            subtitle="Users with DND on"
            icon={Moon}
            loading={isLoading}
          />
          <AdminStatsCard
            title={t('screens.admin.text30dayReadRate')}
            value={delivery ? `${delivery.read_rate}%` : "N/A"}
            subtitle={delivery ? `${delivery.total_read_30d} of ${delivery.total_sent_30d}` : undefined}
            icon={TrendingUp}
            loading={isLoading}
            variant={
              delivery?.read_rate > 50
                ? "success"
                : delivery?.read_rate > 25
                ? "default"
                : "warning"
            }
          />
        </div>

        {/* Delivery overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category opt-in rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                {t('screens.admin.categoryOptinRates')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-full bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : totalWithPrefs === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('screens.admin.noUsersHaveConfiguredPreferencesYet')}
                </p>
              ) : (
                Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const enabledCount = stats?.categories?.[key] || 0;
                  const rate = Math.round((enabledCount / totalWithPrefs) * 100);
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-muted-foreground">
                          {enabledCount}/{totalWithPrefs} ({rate}%)
                        </span>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Delivery summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                {t('screens.admin.text30dayDeliverySummary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{delivery?.total_sent_30d || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.totalSent')}</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{delivery?.total_read_30d || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.totalRead')}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('screens.admin.overallReadRate')}</span>
                      <span className="font-medium">{delivery?.read_rate || 0}%</span>
                    </div>
                    <Progress value={delivery?.read_rate || 0} className="h-3" />
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BellOff className="h-3 w-3" />
                      <span>
                        {stats?.push_disabled || 0} user(s) have push notifications disabled globally.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
