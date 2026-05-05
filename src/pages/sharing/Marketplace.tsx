import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Store, Star, Globe, Users, Zap, Building, Shield } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { BrowseServicesPopup } from "@/components/BrowseServicesPopup";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { t } from '@/lib/i18n-toast';

function Marketplace() {
  const [activeTab, setActiveTab] = useState("featured");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.sharing.integrationMarketplaceSharing')} description="Discover and connect with healthcare platforms, research studies, and wellness apps to maximize the value of your health data." />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.sharing.integrationMarketplace')}
            description="Discover verified integrations to share your health data with trusted healthcare platforms and research studies"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.sharing.searchIntegrationsResearchStudiesHealthcarePlatfor')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Browse Services
            </Button>
          </UtilityActionButton>
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="featured">{t('screens.sharing.featuredIntegrations')}</SplitBarTrigger>
          <SplitBarTrigger value="categories">Categories</SplitBarTrigger>
          <SplitBarTrigger value="connected">{t('screens.sharing.myConnections')}</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="featured">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.premiumHealthcareIntegrations')}
                subtitle="Top-Rated Platforms"
                icon={Building}
                content={
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.epicMychartIntegration')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.text48Rating25m')}</div>
                        </div>
                        <div className="text-green-600 font-bold text-xs">Featured</div>
                      </div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.stanfordMedicineAiLab')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.text49RatingResearchOpportunity')}</div>
                        </div>
                        <div className="text-blue-600 font-bold text-xs">Research</div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.availableApps')}
                subtitle="Total Integrations"
                icon={Store}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">127</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.readyConnect')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.avgRating')}
                subtitle="User Satisfaction"
                icon={Star}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-yellow-600">4.7★</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.highlyRated')}</div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="encouragement" />
            </div>

            {/* Row 3: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.researchStudies2')}
                subtitle="Active Programs"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">18</div>
                    <div className="text-xs text-muted-foreground">Opportunities</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.healthcarePlatforms')}
                subtitle="Medical Systems"
                icon={Shield}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">24</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.hipaaCompliant')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.trendingIntegrations')}
                subtitle="Most Popular This Month"
                icon={Zap}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('screens.sharing.fitbitHealthConnectRealtimeSync')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('screens.sharing.appleHealthIntegrationSeamlessData')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('screens.sharing.mayoClinicConnectPremiumPartnership')}</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="categories">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title={t('screens.sharing.integrationCategories')}
                subtitle="Explore by Type"
                icon={Globe}
                content={
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="font-medium text-sm mb-3">{t('screens.sharing.healthcareMedical')}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.healthcarePlatforms')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text24Apps')}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.electronicHealthRecords')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text12Apps')}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.telemedicinePlatforms')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text8Apps')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium text-sm mb-3">{t('screens.sharing.researchStudies')}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.medicalResearch')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text18Studies')}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.clinicalTrials')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text7Studies')}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{t('screens.sharing.populationHealth')}</span>
                          <span className="text-xs text-muted-foreground">{t('screens.sharing.text5Studies')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="partnership" />
            </div>

            {/* Row 3: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.popularCategories')}
                subtitle="Most Connected This Month"
                icon={Star}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('screens.sharing.fitnessActivityTrackers45Users')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('screens.sharing.electronicHealthRecords38Users')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('screens.sharing.researchParticipation22Users')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>{t('screens.sharing.wellnessApps31Users')}</span>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.totalCategories')}
                subtitle="Available Types"
                icon={Store}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">8</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.differentCategories')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.newThisMonth')}
                subtitle="Fresh Integrations"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">5</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.recentlyAdded')}</div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="connected">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.activeConnections')}
                subtitle="Currently Connected"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">2</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.appsConnected')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.monthlyEarnings')}
                subtitle="Research Participation"
                icon={Star}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">$125</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.thisMonth')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.myActiveConnections')}
                subtitle="Currently Connected Platforms"
                icon={Globe}
                content={
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.fitbitHealthConnect')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.connected3MonthsAgoRealtime')}</div>
                        </div>
                        <div className="text-green-600 text-xs font-bold">Active</div>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.stanfordDiabetesStudy')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.participatingSince2MonthsEarning')}</div>
                        </div>
                        <div className="text-blue-600 text-xs font-bold">Research</div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="guidance" />
            </div>

            {/* Row 3: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title={t('screens.sharing.connectionManagementAnalytics')}
                subtitle="Monitor Your Data Sharing"
                icon={Shield}
                content={
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="font-medium">{t('screens.sharing.dataSharingSummary')}</div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('screens.sharing.totalDataShared')}</span>
                          <span className="font-medium">{t('screens.sharing.text52Gb')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('screens.sharing.syncFrequency')}</span>
                          <span className="font-medium">{t('screens.sharing.realtime')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('screens.sharing.lastActivity')}</span>
                          <span className="font-medium">{t('screens.sharing.text2HoursAgo')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium">{t('screens.sharing.connectionHealth')}</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>{t('screens.sharing.allConnectionsSecureEncrypted')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{t('screens.sharing.dataSyncOperatingNormally')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{t('screens.sharing.researchParticipationTrack')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>

          <BrowseServicesPopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)} 
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Marketplace, SCREEN_IDS.SHARING_MARKETPLACE);