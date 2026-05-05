import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { adminCommunityNavigation } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { Flag, Users, Calendar, AlertCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';

const CommunitySupervision = () => {
  return (
    <AdminGuard>
      <AppLayout>
        <SEO 
          title={t('screens.admin.communitySupervisionAdmin')}
          description="Monitor and moderate community content, events, and groups"
        />
        
        <SubNavigation items={adminCommunityNavigation} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.communitySupervision')}
              description="Monitor and moderate community content, events, and groups"
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('screens.admin.pendingReports2')}</p>
                    <p className="text-3xl font-bold mt-2">3</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.requiresAttention')}</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Flag className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('screens.admin.activeEvents')}</p>
                    <p className="text-3xl font-bold mt-2">24</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.text7PendingApproval')}</p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('screens.admin.activeGroups')}</p>
                    <p className="text-3xl font-bold mt-2">12</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.allApproved')}</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('screens.admin.flaggedContent')}</p>
                    <p className="text-3xl font-bold mt-2">2</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('screens.admin.underReview')}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('screens.admin.recentModerationActivity')}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Flag className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">{t('screens.admin.spamReportReviewed')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.eventWeekendYogaRetreatNo')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('screens.admin.text2HoursAgo')}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{t('screens.admin.eventApproved')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.mentalHealthWorkshopByDrSarah')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('screens.admin.text4HoursAgo')}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{t('screens.admin.groupCreated')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.nutritionEnthusiastsAutoapproved')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('screens.admin.text6HoursAgo')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
};

export default CommunitySupervision;