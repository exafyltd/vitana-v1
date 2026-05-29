import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminMonitoringNavigation } from "@/config/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  AlertTriangle,
  Server,
  Globe,
  PlayCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAPIMonitoring } from "@/hooks/useRealtimeAPIMonitoring";
import { RecentActivityFeed } from "@/components/admin/api-monitoring/RecentActivityFeed";
import { notify, notifyError, t } from '@/lib/i18n-toast';

import { fmtDateTime, formatDistanceToNow } from '@/lib/locale-format';
export default function APIMonitoring() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Enable real-time subscriptions
  useRealtimeAPIMonitoring();

  // Fetch API integrations
  const { data: integrations, isLoading: integrationsLoading, refetch: refetchIntegrations } = useQuery({
    queryKey: ["api-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent test logs
  const { data: testLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["api-test-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_test_logs")
        .select(`
          *,
          api_integrations (
            name,
            integration_type
          )
        `)
        .order("timestamp", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch test notifications
  const { data: notifications } = useQuery({
    queryKey: ["api-test-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_test_notifications")
        .select(`
          *,
          api_integrations (
            name,
            integration_type
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate stats
  const stats = {
    total: integrations?.length || 0,
    active: integrations?.filter(i => i.is_active).length || 0,
    healthy: testLogs?.filter(l => l.status === 'success').length || 0,
    failing: testLogs?.filter(l => l.status === 'failed').length || 0,
    edgeFunctions: integrations?.filter(i => (i.metadata as any)?.deployment_type === 'edge_function').length || 0,
    externalAPIs: integrations?.filter(i => (i.metadata as any)?.deployment_type === 'external_api').length || 0,
  };

  const handleDiscoverIntegrations = async () => {
    notify('toasts.admin.discoveringIntegrations', 'toasts.admin.scanningSystemForApisEdgeFunctions');

    try {
      const { data, error } = await supabase.functions.invoke("integration-discovery");
      if (error) throw error;

      const hadErrors = Array.isArray((data as any)?.errors) && (data as any).errors.length > 0;
      if (hadErrors || (data as any)?.success === false) {
        notifyError('toasts.admin.discoveryCompletedWithErrors');
      } else {
        notify('toasts.admin.discoveryComplete');
      }

      refetchIntegrations();
    } catch (error) {
      notifyError('toasts.admin.discoveryFailed', 'toasts.admin.couldNotScanIntegrations');
    }
  };

  const handleTestIntegration = async (integrationId: string) => {
    notify('toasts.admin.testingIntegration', 'toasts.admin.runningHealthCheck');

    try {
      const { data, error } = await supabase.functions.invoke("test-api-integration", {
        body: { integrationId }
      });

      if (error) throw error;

      notify('toasts.admin.testCompleted');

      refetchIntegrations();
    } catch (error) {
      notifyError('toasts.admin.testFailed', 'toasts.admin.couldNotCompleteHealthCheck');
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />{t('screens.admin.healthy')}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('screens.admin.failed')}</Badge>;
      case 'warning':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />{t('screens.admin.warning')}</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{t('screens.admin.pending')}</Badge>;
    }
  };

  const getIntegrationIcon = (type: string, metadata?: any) => {
    const deploymentType = metadata?.deployment_type;
    
    // Show deployment type icon
    if (deploymentType === 'edge_function') {
      return <Zap className="w-4 h-4 text-purple-500" />;
    } else if (deploymentType === 'external_api') {
      return <Globe className="w-4 h-4 text-blue-500" />;
    }
    
    // Fallback based on integration type
    switch (type) {
      case 'mcp':
        return <Server className="w-4 h-4 text-orange-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.apiMcpMonitoringAdmin')}
        description="Monitor API integrations, edge functions, and MCP protocols"
        canonical={window.location.href}
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SubNavigation items={adminMonitoringNavigation} />
          
          <div className="space-y-6 mt-6">
            <AdminHeader
              title={t('screens.admin.apiMcpMonitoring')}
              description="Monitor and manage all API integrations, edge functions, and MCP protocols"
              emoji="🔌"
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.admin.totalIntegrations')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.activeActive', { active: stats.active })}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.admin.edgeFunctions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Zap className="w-6 h-6 text-purple-500" />
                    <div className="text-3xl font-bold">{stats.edgeFunctions}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.supabaseFunctions')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.admin.externalApis')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Globe className="w-6 h-6 text-blue-500" />
                    <div className="text-3xl font-bold">{stats.externalAPIs}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.thirdpartyServices')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.admin.healthStatus')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {stats.failing > 0 ? (
                      <>
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div className="text-3xl font-bold text-red-500">{stats.failing}</div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                        <div className="text-3xl font-bold text-green-500">{t('screens.admin.allOk')}</div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.recentTests')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">{t('screens.admin.overview')}</TabsTrigger>
                <TabsTrigger value="integrations">{t('screens.admin.integrations')}</TabsTrigger>
                <TabsTrigger value="logs">{t('screens.admin.testLogs')}</TabsTrigger>
                <TabsTrigger value="alerts">{t('screens.admin.alerts')}</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <RecentActivityFeed testLogs={testLogs} isLoading={logsLoading} />
              </TabsContent>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t('screens.admin.apiIntegrationsRegistry')}</CardTitle>
                        <CardDescription>{t('screens.admin.manageAllRegisteredApisEdgeFunctions')}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleDiscoverIntegrations} variant="default" size="sm">
                          <Server className="w-4 h-4 mr-2" />
                          {t('screens.admin.discover')}
                        </Button>
                        <Button onClick={() => refetchIntegrations()} variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('screens.admin.refresh')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {integrationsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">{t('screens.admin.loadingIntegrations')}</div>
                    ) : integrations && integrations.length > 0 ? (
                      <div className="space-y-3">
                        {integrations.map((integration) => (
                           <div key={integration.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {getIntegrationIcon(integration.integration_type, integration.metadata)}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-semibold">{integration.name}</h3>
                                    {integration.is_active ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('screens.admin.active')}</Badge>
                                    ) : (
                                      <Badge variant="outline">{t('screens.admin.inactive')}</Badge>
                                    )}
                                    {(integration.metadata as any)?.deployment_type && (
                                      <Badge variant="secondary" className="text-xs">
                                        {(integration.metadata as any).deployment_type === 'edge_function' ? 'Edge Function' : 'External API'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{integration.base_url}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs text-muted-foreground">{t('screens.admin.typeIntegration_type', { integration_type: integration.integration_type })}</span>
                                    {integration.last_test_status && (
                                      <span className="text-xs">{t('screens.admin.lastTestValue0', { value0: getStatusBadge(integration.last_test_status) })}</span>
                                    )}
                                    {integration.last_test_timestamp && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(integration.last_test_timestamp), { addSuffix: true })}
                                      </span>
                                    )}
                                  </div>
                                  {integration.notes && (
                                    <p className="text-sm text-muted-foreground mt-2 italic">{integration.notes}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestIntegration(integration.id)}
                                >
                                  <PlayCircle className="w-4 h-4 mr-1" />
                                  {t('screens.admin.test')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb/functions`, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">{t('screens.admin.noIntegrationsRegisteredYet')}</p>
                        <Button variant="outline">
                          {t('screens.admin.addFirstIntegration')}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Test Logs Tab */}
              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('screens.admin.testExecutionHistory')}</CardTitle>
                    <CardDescription>{t('screens.admin.detailedLogsAllApiHealthChecks')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {logsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">{t('screens.admin.loadingLogs')}</div>
                    ) : testLogs && testLogs.length > 0 ? (
                      <div className="space-y-2">
                        {testLogs.map((log) => (
                          <div key={log.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getIntegrationIcon(log.api_integrations?.integration_type || '')}
                                <span className="font-medium">{log.api_integrations?.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {log.response_time_ms && (
                                  <Badge variant="outline">{t('screens.admin.response_time_msMs', { response_time_ms: log.response_time_ms })}</Badge>
                                )}
                                {getStatusBadge(log.status)}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{t('screens.admin.testTypeValue0', { value0: log.test_type || 'automated' })}</p>
                              <p>{t('screens.admin.timeValue0', { value0: log.timestamp && fmtDateTime(new Date(log.timestamp)) })}</p>
                              {log.error_log && (
                                <p className="text-red-500 mt-2">{t('screens.admin.errorError_log', { error_log: log.error_log })}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">{t('screens.admin.noTestLogsAvailable')}</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      {t('screens.admin.alertNotifications')}
                    </CardTitle>
                    <CardDescription>{t('screens.admin.recentAlertsNotificationsFromApiMonitoring')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {notifications && notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant={notification.severity === 'critical' ? 'destructive' : 'secondary'}>
                                    {notification.severity}
                                  </Badge>
                                  <span className="text-sm font-medium">{notification.api_integrations?.name}</span>
                                </div>
                                <p className="text-sm">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.sent_at && formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-muted-foreground">{t('screens.admin.noAlertsAllSystemsOperational')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
