import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { adminCommunityNavigation } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { Flag, Users, Calendar, AlertCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';
import { ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

const CommunitySupervision = () => {
  const spotlight = useSpotlightEnabled();
  const adminBody = (
    <>
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
                  <div className="p-3 bg-status-error-subtle rounded-lg">
                    <Flag className="h-6 w-6 text-status-error" />
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
                  <div className="p-3 bg-status-info-subtle rounded-lg">
                    <Calendar className="h-6 w-6 text-status-info" />
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
                  <div className="p-3 bg-status-success-subtle rounded-lg">
                    <Users className="h-6 w-6 text-status-success" />
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
                  <div className="p-3 bg-status-warning-subtle rounded-lg">
                    <AlertCircle className="h-6 w-6 text-status-warning" />
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
                    <Flag className="h-5 w-5 text-status-error" />
                    <div>
                      <p className="font-medium">{t('screens.admin.spamReportReviewed')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.eventWeekendYogaRetreatNo')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('screens.admin.text2HoursAgo')}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-status-info" />
                    <div>
                      <p className="font-medium">{t('screens.admin.eventApproved')}</p>
                      <p className="text-sm text-muted-foreground">{t('screens.admin.mentalHealthWorkshopByDrSarah')}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{t('screens.admin.text4HoursAgo')}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-status-success" />
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
    </>
  );

  return (
    <AdminGuard>
      <AppLayout>
        <SEO 
          title={t('screens.admin.communitySupervisionAdmin')}
          description="Monitor and moderate community content, events, and groups"
        />
        
        <SubNavigation items={adminCommunityNavigation} />
        
        {spotlight ? (
          <ScreenFrame archetype="workspace">
            {adminBody}
          </ScreenFrame>
        ) : (
          <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to min-h-screen">{adminBody}</div>
        )}
      </AppLayout>
    </AdminGuard>
  );
};

export default CommunitySupervision;