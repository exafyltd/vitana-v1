import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminLiveStreamNavigation } from "@/config/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, TrendingUp, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from '@/lib/i18n-toast';

export default function CommunityRoomsAdmin() {
  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.communityRoomsAdminVitana')} 
        description="Manage community live rooms and sessions" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminLiveStreamNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.communityRoomsManagement')}
            description="Manage all community live rooms, schedules, and analytics"
            emoji="👥"
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('screens.admin.activeRooms')}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">{t('screens.admin.currentlyLive')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('screens.admin.totalViewers')}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">{t('screens.admin.acrossAllRooms')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('screens.admin.scheduled')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">{t('screens.admin.upcomingSessions')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t('screens.admin.moderation')}</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">{t('screens.admin.pendingReports')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="active" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="active">{t('screens.admin.activeRooms')}</TabsTrigger>
                <TabsTrigger value="scheduled">{t('screens.admin.scheduled')}</TabsTrigger>
                <TabsTrigger value="analytics">{t('screens.admin.analytics')}</TabsTrigger>
                <TabsTrigger value="moderation">{t('screens.admin.moderation')}</TabsTrigger>
              </TabsList>
              
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('screens.admin.createRoom')}
              </Button>
            </div>

            <TabsContent value="active" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.activeLiveRooms')}</CardTitle>
                  <CardDescription>{t('screens.admin.roomsCurrentlyStreaming')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    {t('screens.admin.noActiveRoomsAtMoment')}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.scheduledSessions')}</CardTitle>
                  <CardDescription>{t('screens.admin.upcomingCommunityLiveRooms')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    {t('screens.admin.noScheduledSessions')}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.roomAnalytics')}</CardTitle>
                  <CardDescription>{t('screens.admin.performanceEngagementMetrics')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    {t('screens.admin.analyticsWillAppearHere')}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="moderation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('screens.admin.moderationTools')}</CardTitle>
                  <CardDescription>{t('screens.admin.manageReportsEnforceCommunityGuidelines')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    {t('screens.admin.noPendingModerationActions')}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
