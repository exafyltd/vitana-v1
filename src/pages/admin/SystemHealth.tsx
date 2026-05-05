import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Server, Database, Zap } from "lucide-react";
import { adminDashboardNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

export default function SystemHealth() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.adminSystemHealth')} 
        description="Monitor system performance and status" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.systemHealth')}
            description="Monitor system performance, uptime, and resource usage"
            emoji="🏥"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">99.9%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.uptime')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">45%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.cpuUsage')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">67%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.storage')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{t('screens.admin.text234ms')}</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.avgResponse')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.systemStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('screens.admin.allSystemsOperational')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
