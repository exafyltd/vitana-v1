import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Activity, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAutomationNavigation } from "@/config/navigation";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import { t } from '@/lib/i18n-toast';

export default function AutomationOverview() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.automationAdminVitana')} 
        description="Manage and monitor automation workflows across the platform" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAutomationNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.automation')}
            description="Build, deploy, and monitor automated workflows to enhance user experience"
            emoji="⚡"
          />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatsCard
              title={t('screens.admin.activeAutomations')}
              value={0}
              subtitle="Currently running"
              icon={Zap}
            />

            <AdminStatsCard
              title={t('screens.admin.executionsToday')}
              value={0}
              subtitle="Total runs"
              icon={Activity}
              variant="success"
            />

            <AdminStatsCard
              title={t('screens.admin.successRate')}
              value="0%"
              subtitle="Last 24 hours"
              icon={CheckCircle2}
            />

            <AdminStatsCard
              title={t('screens.admin.pendingActions')}
              value={0}
              subtitle="In queue"
              icon={Clock}
            />
          </div>

          {/* Quick Access Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('screens.admin.manageAutomations')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => navigate('/admin/automation/builder')}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('screens.admin.automationBuilder')}</CardTitle>
                      <CardDescription>{t('screens.admin.createNewWorkflows')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Build powerful automation rules with triggers, conditions, and actions. 
                    Start from scratch or use AI-discovered patterns.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{t('screens.admin.activeWorkflows')}</CardTitle>
                      <CardDescription>{t('screens.admin.monitorRunningAutomations')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    View and manage all active automation workflows. Check execution 
                    logs and performance metrics.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.automationSystem')}</CardTitle>
              <CardDescription>{t('screens.admin.howAutomationWorkflowsOperate')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.triggerEvents')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automations start when specific events occur, such as user actions, 
                    time schedules, or system events.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.conditions')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Define rules that must be met before actions execute. Filter by user 
                    attributes, context, or data values.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <h4 className="font-semibold">{t('screens.admin.actions')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Execute specific operations like sending notifications, updating data, 
                    or triggering other workflows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
