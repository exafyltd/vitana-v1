import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminMonitoringNavigation } from "@/config/navigation";
import NotificationMonitor from "@/components/admin/NotificationMonitor";
import CronHealthCard from "@/components/admin/CronHealthCard";
import NotificationStats from "@/components/admin/NotificationStats";
import { Bell } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export default function NotificationDashboard() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminNotificationDashboard')} 
        description="Monitor and manage the VITANA notification system" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminMonitoringNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.notificationDashboard')}
            description="Monitor notification system health, view real-time logs, and manage notification rules"
            emoji="📬"
          />

          {/* Top Row: Cron Health + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <CronHealthCard />
            </div>
            <div className="lg:col-span-2">
              <NotificationStats />
            </div>
          </div>

          {/* Bottom Row: Real-time Monitor */}
          <NotificationMonitor />
        </div>
      </div>
    </AppLayout>
  );
}
