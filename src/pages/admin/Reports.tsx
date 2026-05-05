import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, DollarSign, Download, Filter } from "lucide-react";
import { adminMonitoringNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

function Reports() {
  return (
    <AppLayout>
      <SEO title={t('screens.admin.reportsKpisAdmin')} description="View system reports and key performance indicators" canonical={window.location.href} />
      <SubNavigation items={adminMonitoringNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.reportsKeyPerformanceIndicators')}
            description="Monitor system performance, user engagement, and business metrics"
            emoji="📊"
          />

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">12,547</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.activeUsers')}</p>
                    <p className="text-xs text-green-600">{t('screens.admin.text52ThisMonth')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">$248K</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.monthlyRevenue')}</p>
                    <p className="text-xs text-green-600">{t('screens.admin.text128ThisMonth')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">847</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.avgSessionTime')}</p>
                    <p className="text-xs text-green-600">{t('screens.admin.text31ThisMonth')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">94.2%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.systemUptime')}</p>
                    <p className="text-xs text-green-600">{t('screens.admin.text03ThisMonth')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">{t('screens.admin.overview')}</TabsTrigger>
              <TabsTrigger value="users">{t('screens.admin.userAnalytics')}</TabsTrigger>
              <TabsTrigger value="revenue">{t('screens.admin.revenue')}</TabsTrigger>
              <TabsTrigger value="health">{t('screens.admin.systemHealth')}</TabsTrigger>
              <TabsTrigger value="custom">{t('screens.admin.customReports')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {t('screens.admin.userGrowthTrends')}
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        {t('screens.admin.export')}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded">
                      <p className="text-muted-foreground">{t('screens.admin.interactiveChartPlaceholder')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('screens.admin.revenueAnalytics')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50 rounded">
                      <p className="text-muted-foreground">{t('screens.admin.revenueChartPlaceholder')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('screens.admin.userAnalyticsDashboard')}</h3>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {t('screens.admin.filter')}
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.userEngagementMetrics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.detailedUserBehaviorEngagementAnalytics')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.revenueBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.detailedRevenueAnalysisFinancialMetrics')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.systemPerformance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.systemHealthMonitoringPerformanceMetrics')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.customReportBuilder')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.createCustomReportsScheduledAnalytics')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Reports, SCREEN_IDS.ADMIN_REPORTS_KPIS);