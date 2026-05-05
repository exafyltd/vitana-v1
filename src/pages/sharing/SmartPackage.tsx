import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Plus, Brain, Zap, Package, Sparkles, Target, Users } from "lucide-react";
import { useState } from "react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { SmartPackagePopup } from "@/components/SmartPackagePopup";
import { MotivationalBanner } from "@/components/MotivationalBanner";
import { StandardCard } from "@/components/templates/StandardCard";
import { t } from '@/lib/i18n-toast';

function SmartPackage() {
  const [activeTab, setActiveTab] = useState("recommendations");
  const [actionPopupOpen, setActionPopupOpen] = useState(false);

  return (
    <AppLayout>
      <SEO title={t('screens.sharing.smartPackageCreatorSharing')} description="Use AI-powered recommendations to create intelligent health data packages optimized for your specific needs." />
      <SubNavigation items={sharingNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.sharing.smartPackageCreator')}
            description="AI-powered data package creation with intelligent recommendations based on your health profile"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.sharing.searchAiRecommendationsTemplatesDataTypes')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setActionPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          </UtilityActionButton>
      <SplitBar value={activeTab} onValueChange={setActiveTab}>
        <SplitBarList>
          <SplitBarTrigger value="recommendations">{t('screens.sharing.aiRecommendations')}</SplitBarTrigger>
          <SplitBarTrigger value="builder">{t('screens.sharing.customBuilder')}</SplitBarTrigger>
          <SplitBarTrigger value="templates">Templates</SplitBarTrigger>
        </SplitBarList>

        <SplitBarContent value="recommendations">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.aipoweredRecommendations')}
                subtitle="Smart Package Suggestions"
                icon={Brain}
                content={
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{t('screens.sharing.cardiologyConsultationPackage')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.sharing.text95MatchHeartRateData')}</div>
                          </div>
                          <div className="text-green-600 font-bold text-xs">95%</div>
                        </div>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{t('screens.sharing.annualPhysicalPackage')}</div>
                            <div className="text-xs text-muted-foreground">{t('screens.sharing.text92MatchAppointmentScheduled')}</div>
                          </div>
                          <div className="text-green-600 font-bold text-xs">92%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.aiAccuracy')}
                subtitle="Prediction Score"
                icon={Target}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.matchAccuracyRate')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.packageTypes')}
                subtitle="Available Options"
                icon={Package}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">24</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.dataCategories')}</div>
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
                title={t('screens.sharing.createdPackages')}
                subtitle="Your Library"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">8</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.packagesReady')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.activeSharing')}
                subtitle="Current Usage"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-orange-600">3</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.packagesUse')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.recentAiInsights')}
                subtitle="Latest Recommendations"
                icon={Sparkles}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('screens.sharing.detectedUpcomingCardiologyAppointment')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('screens.sharing.heartRateVariabilityPatternsAnalyzed')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('screens.sharing.researchStudyEligibilityMatched')}</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="builder">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title={t('screens.sharing.customPackageBuilder')}
                subtitle="Create Tailored Data Packages"
                icon={Package}
                content={
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">{t('screens.sharing.packageName')}</label>
                        <input 
                          type="text" 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          placeholder={t('screens.sharing.eGCardiologyConsultationPackage')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">{t('screens.sharing.purposerecipient')}</label>
                        <input 
                          type="text" 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          placeholder={t('screens.sharing.eGDrSmithAtMayo')}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea 
                          className="w-full mt-1 p-2 border rounded-lg" 
                          rows={2}
                          placeholder={t('screens.sharing.describeSpecificUseCase')}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="font-medium text-sm">{t('screens.sharing.dataTypeSelection')}</div>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {["Lab Results", "Vital Signs", "Activity Data", "Sleep Patterns", "Nutrition Tracking", "Medication History"].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">{type}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-4">{t('screens.sharing.generateAiRecommendations')}</Button>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Row 2: Motivational Banner */}
            <div className="col-span-12">
              <MotivationalBanner variant="guidance" />
            </div>

            {/* Row 3: Big + Small + Small (6+3+3) */}
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.smartSuggestions')}
                subtitle="AI-Powered Recommendations"
                icon={Brain}
                content={
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{t('screens.sharing.includeRecentLabResultsForComprehensive')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>{t('screens.sharing.addMedicationHistoryForDrugInteractions')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>{t('screens.sharing.includeActivityDataForLifestyleAssessment')}</span>
                    </div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.templates2')}
                subtitle="Quick Start"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">6</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.availableTemplates')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.dataTypes')}
                subtitle="Available"
                icon={Package}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">24</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.categoriesReady')}</div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>

        <SplitBarContent value="templates">
          <div className="grid grid-cols-12 gap-4">
            {/* Row 1: Small + Small + Big (3+3+6) */}
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.quickTemplates')}
                subtitle="Ready to Use"
                icon={Zap}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">6</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.prebuiltPackages')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <StandardCard
                title={t('screens.sharing.mostPopular')}
                subtitle="Community Favorite"
                icon={Users}
                content={
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">89%</div>
                    <div className="text-xs text-muted-foreground">{t('screens.sharing.successRate')}</div>
                  </div>
                }
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <StandardCard
                title={t('screens.sharing.packageTemplatesLibrary')}
                subtitle="Choose Your Starting Point"
                icon={Package}
                content={
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.generalHealthCheckup')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.completeHealthOverviewForAnnualVisits')}</div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{t('screens.sharing.specialistConsultation')}</div>
                          <div className="text-xs text-muted-foreground">{t('screens.sharing.targetedDataForSpecialistAppointments')}</div>
                        </div>
                        <Button size="sm" variant="outline">Use</Button>
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

            {/* Row 3: Single Full Row (12) */}
            <div className="col-span-12">
              <StandardCard
                title={t('screens.sharing.advancedTemplateFeatures')}
                subtitle="Coming Soon"
                icon={Sparkles}
                content={
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>{t('screens.sharing.aicustomizedTemplatesBasedYourData')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{t('screens.sharing.dynamicTemplatesThatAdaptAppointments')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>{t('screens.sharing.collaborativeTemplatesWithHealthcareProviders')}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>{t('screens.sharing.smartTemplateRecommendations')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>{t('screens.sharing.templateSharingWithCommunity')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>{t('screens.sharing.versionControlTemplateHistory')}</span>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </SplitBarContent>
      </SplitBar>

          <SmartPackagePopup 
            isOpen={actionPopupOpen} 
            onClose={() => setActionPopupOpen(false)} 
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(SmartPackage, SCREEN_IDS.SHARING_SMART_PACKAGE);