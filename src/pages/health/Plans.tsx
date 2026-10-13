import { useUrlTab } from "@/hooks/useUrlTab";
import { useState, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { healthNavigation } from "@/config/navigation";
import { PersonalizedPlanCard } from "@/components/health/PersonalizedPlanCard";
import { PlanGeneratorWizard } from "@/components/health/PlanGeneratorWizard";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { NutritionPlanView } from "@/components/health/nutrition/NutritionPlanView";
import { ExercisePlanView } from "@/components/health/exercise/ExercisePlanView";
import { HydrationPlanView } from "@/components/health/hydration/HydrationPlanView";
import { SleepPlanView } from "@/components/health/sleep/SleepPlanView";
import { MentalPlanView } from "@/components/health/mental/MentalPlanView";
import { CrossPlanRelationshipWidget } from "@/components/health/CrossPlanRelationshipWidget";
import { VitanaScoreTooltip } from "@/components/health/VitanaScoreTooltip";
import { calculateAutopilotContext } from "@/services/autopilotContext";
import { toast } from "sonner";
import { lookup, t } from '@/lib/i18n-toast';
import { ArchetypeSkeleton, ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { TIER_B_GRID, TierBSection } from "@/components/spotlight/tier-b/TierBKit";

export default withScreenId(function Plans() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useUrlTab("tab", "all");
  const [selectedPlanType, setSelectedPlanType] = useState<string | undefined>(undefined);
  const { plans, isLoading } = useHealthPlans();
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();

  // Calculate autopilot context
  const autopilotData = useMemo(() => {
    return calculateAutopilotContext(plans || []);
  }, [plans]);
  
  // Footer button handlers
  const handleRecalibrateAll = () => {
    toast.info(lookup('toasts.health.recalibrationStarted'), {
      description: 'Analyzing all plans and cross-pillar synergies. This may take a few moments...',
      action: {
        label: 'View Progress',
        onClick: () => navigate('/health/plans')
      }
    });
  };

  const handleViewReport = () => {
    toast.info(lookup('toasts.health.reportGeneration'), {
      description: 'Your detailed health analytics report is being prepared. Check back in a few minutes!',
      action: {
        label: 'Got it',
        onClick: () => {}
      }
    });
  };

  const handleOptimizeWeakest = () => {
    // Find plan with lowest adherence score
    const weakestPlan = plans && plans.length > 0
      ? plans.reduce((min, p) => p.adherence_score < min.adherence_score ? p : min)
      : null;
    const weakestPillar = weakestPlan?.plan_type || 'nutrition';
    
    toast.success(`✨ Optimizing ${weakestPillar.charAt(0).toUpperCase() + weakestPillar.slice(1)}`, {
      description: 'AI Autopilot is analyzing your weakest pillar and generating targeted improvements.',
      action: {
        label: 'View Plan',
        onClick: () => navigate(`/health/plans/${weakestPillar}`)
      }
    });
  };
  
  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below).
  if (spotlight) {
    const planTabs: { value: string; label: string; view?: ReactNode }[] = [
      { value: 'all', label: t('screens.health.allPlans') },
      { value: 'nutrition', label: t('screens.health.nutrition'), view: <NutritionPlanView /> },
      { value: 'exercise', label: t('screens.health.exercise'), view: <ExercisePlanView /> },
      { value: 'hydration', label: t('screens.health.hydration'), view: <HydrationPlanView /> },
      { value: 'sleep', label: t('screens.health.sleep'), view: <SleepPlanView /> },
      { value: 'mental', label: t('screens.health.mental'), view: <MentalPlanView /> },
    ];
    return (
      <AppLayout>
        <SEO title={t('screens.health.personalizedHealthPlansVitana')} description={t('spotlightTierB.health.plansDescription')} canonical={window.location.href} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: healthNavigation }}
          header={{ title: t('screens.health.yourPersonalizedHealthPlans'), description: t('spotlightTierB.health.plansDescription'), emoji: '🎯' }}
          utility={{
            children: (
              <>
                <ExpandableSearchButton placeholder={t('screens.health.searchPlans')} />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedPlanType(undefined);
                    setWizardOpen(true);
                  }}
                >
                  <Plus className="me-2 h-4 w-4" />
                  {t('screens.health.generateNewPlan')}
                </Button>
              </>
            ),
          }}
          tabs={{ value: activeTab, onValueChange: setActiveTab, items: planTabs.map(({ value, label }) => ({ value, label })) }}
        >
          <SplitBarContent value="all">
            {isLoading ? (
              <ArchetypeSkeleton archetype="collection" />
            ) : (
              <div className="flex flex-col gap-6">
                <div className={TIER_B_GRID}>
                  {['nutrition', 'exercise', 'hydration', 'sleep', 'mental', 'supplement'].map((planType) => (
                    <PersonalizedPlanCard
                      key={planType}
                      type={planType as Parameters<typeof PersonalizedPlanCard>[0]['type']}
                      onGenerateClick={() => {
                        setSelectedPlanType(planType);
                        setWizardOpen(true);
                      }}
                    />
                  ))}
                </div>
                <CrossPlanRelationshipWidget relationships={autopilotData.relationships} lastSynced={autopilotData.lastRecalibration} />
                <TierBSection title={t('screens.health.autopilotSummary')} className="rounded-vcard border bg-card p-5 shadow-vcard">
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div>
                      <VitanaScoreTooltip score={autopilotData.vitanaScore}>
                        <button type="button" className="font-semibold transition-colors hover:text-foreground">
                          {t('screens.health.vitanascoreVitanaScore', { vitanaScore: autopilotData.vitanaScore })}
                        </button>
                      </VitanaScoreTooltip>
                      <span>{t('screens.health.text5ActivePlansSyncedCrosspillarSynergy', { synergyScore: autopilotData.synergyScore })}</span>
                    </div>
                    <div>
                      {t('screens.health.nextRecalibration')} <span className="font-medium text-foreground">{autopilotData.nextRecalibration}</span>
                      {t('screens.health.adjustmentLastadjustment', { lastAdjustment: autopilotData.lastAdjustment })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="rounded-full" onClick={handleRecalibrateAll}>
                      {t('screens.health.recalibrateAll')}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={handleViewReport}>
                      {t('screens.health.viewDetailedReport')}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={handleOptimizeWeakest}>
                      {t('screens.health.optimizeWeakestPillar')}
                    </Button>
                  </div>
                </TierBSection>
              </div>
            )}
          </SplitBarContent>
          {planTabs
            .filter((tab) => tab.view)
            .map((tab) => (
              <SplitBarContent key={tab.value} value={tab.value}>
                {tab.view}
              </SplitBarContent>
            ))}
          <SplitBarContent value="supplement">
            <PersonalizedPlanCard type="supplement" detailed />
          </SplitBarContent>
        </ScreenFrame>
        <PlanGeneratorWizard
          open={wizardOpen}
          onOpenChange={(open) => {
            setWizardOpen(open);
            if (!open) setSelectedPlanType(undefined);
          }}
          defaultPlanType={selectedPlanType}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={t('screens.health.personalizedHealthPlansVitana')}
        description="AI-powered nutrition, exercise, hydration, sleep, and wellness plans tailored to your unique health profile and goals"
        canonical={window.location.href}
      />
      
      <SubNavigation items={healthNavigation} />
      
      {/* Outer Container */}
      <div className="p-6 bg-gradient-to-br from-slate-50/70 via-indigo-50/60 to-white/70 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-800/80 min-h-screen">
        {/* Inner Container */}
        <div className="max-w-7xl mx-auto">
          
          <StandardHeader
            title={t('screens.health.yourPersonalizedHealthPlans')}
            description="AI-powered plans tailored to your unique health profile and goals"
            emoji="🎯"
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.health.searchPlans')} />
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedPlanType(undefined);
              setWizardOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('screens.health.generateNewPlan')}
          </Button>
          </UtilityActionButton>
          
          {/* Split Bar Navigation */}
          <SplitBar value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <SplitBarList className="w-full bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="all">{t('screens.health.allPlans')}</SplitBarTrigger>
              <SplitBarTrigger value="nutrition">{t('screens.health.nutrition')}</SplitBarTrigger>
              <SplitBarTrigger value="exercise">{t('screens.health.exercise')}</SplitBarTrigger>
              <SplitBarTrigger value="hydration">{t('screens.health.hydration')}</SplitBarTrigger>
              <SplitBarTrigger value="sleep">{t('screens.health.sleep')}</SplitBarTrigger>
              <SplitBarTrigger value="mental">{t('screens.health.mental')}</SplitBarTrigger>
            </SplitBarList>
            
            <SplitBarContent value="all">
              {isLoading ? (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">{t('screens.health.loadingPlans')}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    {["nutrition", "exercise", "hydration", "sleep", "mental", "supplement"].map((planType, idx) => (
                      <div 
                        key={planType}
                        className="animate-fade-in opacity-0"
                        style={{ 
                          animationDelay: `${idx * 100}ms`,
                          animationFillMode: 'forwards'
                        }}
                      >
            <PersonalizedPlanCard 
              type={planType as any}
              onGenerateClick={() => {
                setSelectedPlanType(planType);
                setWizardOpen(true);
              }}
            />
                      </div>
                    ))}
                  </div>
                  
                  {/* Cross-Plan Relationship Widget */}
                  <div className="mb-6">
                    <CrossPlanRelationshipWidget
                      relationships={autopilotData.relationships}
                      lastSynced={autopilotData.lastRecalibration}
                    />
                  </div>
                  
                  {/* Autopilot Summary Footer */}
                  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-[0_6px_20px_rgba(20,25,40,0.06)]">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        {t('screens.health.autopilotSummary')}
                      </h3>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <div>
                          <VitanaScoreTooltip score={autopilotData.vitanaScore}>
                            <button className="hover:text-slate-900 dark:hover:text-white transition-colors font-semibold">{t('screens.health.vitanascoreVitanaScore', { vitanaScore: autopilotData.vitanaScore })}
                            </button>
                          </VitanaScoreTooltip>
                          <span>{t('screens.health.text5ActivePlansSyncedCrosspillarSynergy', { synergyScore: autopilotData.synergyScore })}</span>
                        </div>
                        <div>
                          {t('screens.health.nextRecalibration')} <span className="font-medium text-slate-700 dark:text-slate-300">{autopilotData.nextRecalibration}</span>{t('screens.health.adjustmentLastadjustment', { lastAdjustment: autopilotData.lastAdjustment })}</div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={handleRecalibrateAll}
                        className="inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-[13px] font-medium transition-colors"
                      >{t('screens.health.recalibrateAll')}
                      </button>
                      <button 
                        onClick={handleViewReport}
                        className="inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[13px] font-medium transition-colors"
                      >{t('screens.health.viewDetailedReport')}
                      </button>
                      <button 
                        onClick={handleOptimizeWeakest}
                        className="inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[13px] font-medium transition-colors"
                      >{t('screens.health.optimizeWeakestPillar')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </SplitBarContent>
            
            {/* Nutrition Plan - Full Recipe View */}
            <SplitBarContent value="nutrition">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <NutritionPlanView />
                </div>
              </div>
            </SplitBarContent>
            
            {/* Exercise Plan - Full Workout View */}
            <SplitBarContent value="exercise">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <ExercisePlanView />
                </div>
              </div>
            </SplitBarContent>
            
            {/* Hydration Plan - Full View */}
            <SplitBarContent value="hydration">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <HydrationPlanView />
                </div>
              </div>
            </SplitBarContent>
            
            {/* Sleep Plan - Full View */}
            <SplitBarContent value="sleep">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <SleepPlanView />
                </div>
              </div>
            </SplitBarContent>
            
            {/* Mental Plan - Full View */}
            <SplitBarContent value="mental">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                  <MentalPlanView />
                </div>
              </div>
            </SplitBarContent>
            
            {/* Other plan type tabs */}
            {['supplement'].map(type => (
              <SplitBarContent key={type} value={type}>
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12">
                    <PersonalizedPlanCard type={type as any} detailed />
                  </div>
                </div>
              </SplitBarContent>
            ))}
          </SplitBar>
        </div>
      </div>
      
      <PlanGeneratorWizard
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) setSelectedPlanType(undefined);
        }}
        defaultPlanType={selectedPlanType}
      />
    </AppLayout>
  );
}, SCREEN_IDS.HEALTH_PLANS);
