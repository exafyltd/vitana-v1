import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Mail, Smartphone, Bell, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

interface Stats {
  total_today: number;
  email_sent: number;
  push_sent: number;
  failed: number;
  users_with_notifications_enabled: number;
}

export default function NotificationStats() {
  const [stats, setStats] = useState<Stats>({
    total_today: 0,
    email_sent: 0,
    push_sent: 0,
    failed: 0,
    users_with_notifications_enabled: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get today's notification count
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: totalToday } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get sent count
      const { count: sentCount } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'sent')
        .gte('created_at', today.toISOString());

      // Get failed count
      const { count: failedCount } = await supabase
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'failed')
        .gte('created_at', today.toISOString());

      // Get users with notifications enabled
      const { count: enabledUsers } = await supabase
        .from('notification_settings')
        .select('*', { count: 'exact', head: true })
        .or('email_appointments.eq.true,push_enabled.eq.true');

      setStats({
        total_today: totalToday || 0,
        email_sent: sentCount || 0,
        push_sent: 0, // Placeholder
        failed: failedCount || 0,
        users_with_notifications_enabled: enabledUsers || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Today",
      value: stats.total_today,
      icon: Bell,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Emails Sent",
      value: stats.email_sent,
      icon: Mail,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Failed",
      value: stats.failed,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Active Users",
      value: stats.users_with_notifications_enabled,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Notification Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.title} className="text-center">
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">
                {loading ? '...' : stat.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.title}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('screens.admin.successRate')}</p>
              <p className="text-lg font-semibold text-green-600">
                {stats.total_today > 0 
                  ? Math.round((stats.email_sent / stats.total_today) * 100) 
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('screens.admin.failureRate')}</p>
              <p className="text-lg font-semibold text-red-600">
                {stats.total_today > 0 
                  ? Math.round((stats.failed / stats.total_today) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
