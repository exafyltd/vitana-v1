import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, AlertTriangle, Shield, Eye, Play } from "lucide-react";
import { adminMonitoringNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { t } from '@/lib/i18n-toast';

const mockStreams = [
  { id: "1", title: "Morning Yoga Flow", host: "Sarah K.", viewers: 45, status: "live", duration: "32 min" },
  { id: "2", title: "Nutrition Q&A", host: "Dr. Wilson", viewers: 156, status: "live", duration: "18 min" },
  { id: "3", title: "Meditation Session", host: "Mike T.", viewers: 23, status: "live", duration: "45 min" }
];

function StreamSupervision() {
  return (
    <AppLayout>
      <SEO title={t('screens.admin.streamSupervisionAdmin')} description="Monitor and moderate live streams and content" canonical={window.location.href} />
      <SubNavigation items={adminMonitoringNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.streamSupervisionModeration')}
            description="Monitor live streams, ensure content compliance, and manage community standards"
            emoji="📺"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Video className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.liveStreams')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">347</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.totalViewers')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">2</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.reportsPending')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">98.5%</p>
                    <p className="text-sm text-muted-foreground">{t('screens.admin.complianceRate')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="live" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="live">{t('screens.admin.liveStreams')}</TabsTrigger>
              <TabsTrigger value="reports">{t('screens.admin.reports')}</TabsTrigger>
              <TabsTrigger value="moderation">{t('screens.admin.moderation')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('screens.admin.analytics')}</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" />{t('screens.admin.activeStreamsLength', { length: mockStreams.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockStreams.map((stream) => (
                    <div key={stream.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-12 bg-gradient-to-br from-red-100 to-pink-100 rounded flex items-center justify-center">
                            <Play className="w-6 h-6 text-red-500" />
                          </div>
                          <Badge variant="destructive" className="absolute -top-1 -right-1 text-xs">{t('screens.admin.live2')}</Badge>
                        </div>
                        <div>
                          <p className="font-medium">{stream.title}</p>
                          <p className="text-sm text-muted-foreground">{t('screens.admin.hostHostDuration', { host: stream.host, duration: stream.duration })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{stream.viewers}</p>
                          <p className="text-xs text-muted-foreground">{t('screens.admin.viewers')}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          {t('screens.admin.monitor')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.contentReports')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.userReportsContentFlaggingSystem')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="moderation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.moderationTools')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.contentModerationControlsCommunityGuidelinesEnforc')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.streamAnalytics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('screens.admin.streamPerformanceMetricsViewerEngagementData')}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(StreamSupervision, SCREEN_IDS.ADMIN_STREAM_SUPERVISION);