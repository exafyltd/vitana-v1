import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Bell, MessageSquare, Settings, TrendingUp, UserPlus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminDashboardNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Total Users
  const { data: totalUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-stats-total-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("app_users")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  // New users this week
  const { data: newThisWeek, isLoading: loadingNewUsers } = useQuery({
    queryKey: ["admin-stats-new-this-week"],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count, error } = await supabase
        .from("app_users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Pending Signups
  const { data: pendingSignups, isLoading: loadingSignups } = useQuery({
    queryKey: ["admin-stats-pending-signups"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("signup_attempts")
        .select("*", { count: "exact", head: true })
        .eq("status", "started");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Active Notifications (unread)
  const { data: activeNotifications, isLoading: loadingNotifications } = useQuery({
    queryKey: ["admin-stats-active-notifications"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const quickAccessCards = [
    {
      title: "Users & Growth",
      description: "Manage users, signups, invitations, and role assignments",
      icon: Users,
      path: "/admin/users",
      gradient: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Notifications",
      description: "Compose, send, and track notification campaigns",
      icon: Bell,
      path: "/admin/notifications",
      gradient: "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Community",
      description: "Moderate groups, meetups, and community content",
      icon: MessageSquare,
      path: "/admin/community",
      gradient: "from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "System",
      description: "Configuration, tenants, bootstrap, and infrastructure",
      icon: Settings,
      path: "/admin/system",
      gradient: "from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <AppLayout>
      <SubNavigation items={adminDashboardNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.adminDashboard')}
            description="Real-time system management and oversight center"
            emoji="📊"
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatsCard
              title={t('screens.admin.totalUsers')}
              value={totalUsers ?? 0}
              subtitle="All registered users"
              icon={Users}
              loading={loadingUsers}
            />
            <AdminStatsCard
              title={t('screens.admin.newThisWeek')}
              value={newThisWeek ?? 0}
              subtitle="Joined in the last 7 days"
              icon={TrendingUp}
              loading={loadingNewUsers}
              variant="success"
            />
            <AdminStatsCard
              title={t('screens.admin.pendingSignups')}
              value={pendingSignups ?? 0}
              subtitle="Status: started"
              icon={UserPlus}
              loading={loadingSignups}
              variant="warning"
            />
            <AdminStatsCard
              title={t('screens.admin.activeNotifications')}
              value={activeNotifications ?? 0}
              subtitle="Unread notifications"
              icon={Bell}
              loading={loadingNotifications}
              variant="error"
            />
          </div>

          {/* Quick Access */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('screens.admin.quickAccess')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickAccessCards.map((card) => (
                <Card
                  key={card.path}
                  className="hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(card.path)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 bg-gradient-to-br ${card.gradient} rounded-lg`}>
                        <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {card.title}
                          <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminActivityFeed />
            <Card>
              <CardHeader>
                <CardTitle>{t('screens.admin.oasisEvents')}</CardTitle>
                <CardDescription>{t('screens.admin.recentSystemStateTransitions')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-[360px] text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">{t('screens.admin.recentOasisEventsWillAppearHere')}</p>
                  <p className="text-xs mt-1">{t('screens.admin.viewFullLogValue0', { value0: " " })}<button
                      onClick={() => navigate("/admin/dashboard/activity")}
                      className="text-primary underline hover:no-underline"
                    >
                      {t('screens.admin.activityFeed')}
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
