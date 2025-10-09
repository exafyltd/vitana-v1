import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, DollarSign, Download, Filter } from "lucide-react";
import { adminDashboardNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";

function Reports() {
  return (
    <AppLayout>
      <SEO title="Reports & KPIs | Admin" description="View system reports and key performance indicators" canonical={window.location.href} />
      <SubNavigation items={adminDashboardNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Reports & Key Performance Indicators"
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
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-xs text-green-600">↑ +5.2% this month</p>
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
                    <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    <p className="text-xs text-green-600">↑ +12.8% this month</p>
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
                    <p className="text-sm text-muted-foreground">Avg Session Time</p>
                    <p className="text-xs text-green-600">↑ +3.1% this month</p>
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
                    <p className="text-sm text-muted-foreground">System Uptime</p>
                    <p className="text-xs text-green-600">↑ +0.3% this month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">User Analytics</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="health">System Health</TabsTrigger>
              <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      User Growth Trends
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 rounded">
                      <p className="text-muted-foreground">Interactive chart placeholder</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50 rounded">
                      <p className="text-muted-foreground">Revenue chart placeholder</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">User Analytics Dashboard</h3>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Detailed user behavior and engagement analytics.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Detailed revenue analysis and financial metrics.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">System health monitoring and performance metrics.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Report Builder</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Create custom reports and scheduled analytics.</p>
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