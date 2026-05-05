import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { ViewDetailsPopup } from "@/components/ViewDetailsPopup";
import { t } from '@/lib/i18n-toast';

function Logs() {
  const [activeTab, setActiveTab] = useState("activity");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "revoked":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.sharing.logsRevocationSharing')} 
        description="Monitor all data sharing activities, view access logs, and manage revoked permissions with complete transparency."
      />
      <SubNavigation items={sharingNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader 
            title={t('screens.sharing.logsRevocation')} 
            description="Complete transparency into your data sharing activities and access management"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('screens.sharing.viewDetails')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab}>
            <SplitBarList>
              <SplitBarTrigger value="activity">{t('screens.sharing.activityLogs')}</SplitBarTrigger>
              <SplitBarTrigger value="revoked">{t('screens.sharing.revokedAccess')}</SplitBarTrigger>
              <SplitBarTrigger value="analytics">{t('screens.sharing.analytics')}</SplitBarTrigger>
            </SplitBarList>

            <SplitBarContent value="activity">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">{t('screens.sharing.recentDataSharingActivity')}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{t('screens.sharing.dataPackageCreated')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.sharing.mayoClinicResearchJan20')}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.labResults')}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.vitalSigns')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{t('screens.sharing.completed')}</span>
                          <Button size="sm" variant="outline" className="ml-2">{t('screens.sharing.details')}</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{t('screens.sharing.consentGranted')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.sharing.stanfordMedicineAiLabJan')}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.heartRate')}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.bloodPressure')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{t('screens.sharing.completed')}</span>
                          <Button size="sm" variant="outline" className="ml-2">{t('screens.sharing.details')}</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">{t('screens.sharing.dataAccess')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.sharing.vitanaHealthResearchJan19')}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.ecgData')}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{t('screens.sharing.bpTrends')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{t('screens.sharing.completed')}</span>
                          <Button size="sm" variant="outline" className="ml-2">{t('screens.sharing.details')}</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">{t('screens.sharing.activitySummary')}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.totalActivities')}</span>
                        <span className="font-medium">47</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.dataPackagesShared')}</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.thisWeek')}</span>
                        <span className="font-medium">5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="revoked">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">{t('screens.sharing.revokedDataAccess')}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">{t('screens.sharing.diabetesResearchConsortium')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.sharing.revokedJan18StudyCompletion')}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{t('screens.sharing.glucoseData')}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{t('screens.sharing.dietTracking')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{t('screens.sharing.revoked')}</span>
                          <Button size="sm" variant="outline" className="ml-2">{t('screens.sharing.viewHistory')}</Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div>
                          <h4 className="font-medium">{t('screens.sharing.mentalHealthAnalyticsInc')}</h4>
                          <p className="text-sm text-muted-foreground">{t('screens.sharing.revokedJan10PrivacyConcerns')}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{t('screens.sharing.sleepData')}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{t('screens.sharing.stressLevels')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">{t('screens.sharing.restorable')}</span>
                          <Button size="sm" variant="outline" className="ml-2">{t('screens.sharing.restore')}</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">{t('screens.sharing.revocationStats')}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.totalRevoked')}</span>
                        <span className="font-medium">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.canRestore')}</span>
                        <span className="font-medium">1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('screens.sharing.permanentlyRevoked')}</span>
                        <span className="font-medium">2</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SplitBarContent>

            <SplitBarContent value="analytics">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12">
                  <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 relative z-10">
                    <h3 className="text-lg font-semibold mb-4">{t('screens.sharing.dataSharingAnalytics')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">47</div>
                        <div className="text-sm text-muted-foreground">{t('screens.sharing.totalActivities')}</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">12</div>
                        <div className="text-sm text-muted-foreground">{t('screens.sharing.packagesShared')}</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">8</div>
                        <div className="text-sm text-muted-foreground">{t('screens.sharing.activeConsents')}</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">3</div>
                        <div className="text-sm text-muted-foreground">{t('screens.sharing.revokedAccess')}</div>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-center">{t('screens.sharing.detailedAnalyticsTrendsComingSoon')}</p>
                  </div>
                </div>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <ViewDetailsPopup 
        isOpen={actionPopupOpen} 
        onClose={() => setActionPopupOpen(false)} 
      />
    </AppLayout>
  );
}

export default withScreenId(Logs, SCREEN_IDS.SHARING_LOGS);