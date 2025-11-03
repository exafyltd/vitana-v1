import { useState, useMemo } from "react";
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
import { AutopilotInsightBanner } from "@/components/health/AutopilotInsightBanner";
import { CrossPlanRelationshipWidget } from "@/components/health/CrossPlanRelationshipWidget";
import { VitanaScoreTooltip } from "@/components/health/VitanaScoreTooltip";
import { calculateAutopilotContext } from "@/services/autopilotContext";

export default withScreenId(function Plans() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { plans, isLoading } = useHealthPlans();
  
  // Calculate autopilot context
  const autopilotData = useMemo(() => {
    return calculateAutopilotContext(plans || []);
  }, [plans]);
  
  return (
    <AppLayout>
      <SEO 
        title="Personalized Health Plans | Vitana" 
        description="AI-powered nutrition, exercise, hydration, sleep, and wellness plans tailored to your unique health profile and goals"
        canonical={window.location.href}
      />
      
      <SubNavigation items={healthNavigation} />
      
      {/* Outer Container */}
      <div className="p-6 bg-gradient-to-br from-slate-50/70 via-indigo-50/60 to-white/70 dark:from-slate-950/90 dark:via-slate-900/85 dark:to-slate-800/80 min-h-screen">
        {/* Inner Container */}
        <div className="max-w-7xl mx-auto">
          
          <StandardHeader
            title="Your Personalized Health Plans"
            description="AI-powered plans tailored to your unique health profile and goals"
            emoji="🎯"
          />
          
          {/* Autopilot Insight Banner */}
          <AutopilotInsightBanner
            insights={autopilotData.insights}
            synergyScore={autopilotData.synergyScore}
            synergyTrend={autopilotData.synergyTrend}
          />
          
          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search plans..." />
            <Button
              variant="default"
              size="sm"
              onClick={() => setWizardOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate New Plan
            </Button>
          </UtilityActionButton>
          
          {/* Split Bar Navigation */}
          <SplitBar defaultValue="all" className="mb-6">
            <SplitBarList className="w-full bg-white/50 dark:bg-card/50 backdrop-blur-sm rounded-lg p-1">
              <SplitBarTrigger value="all">All Plans</SplitBarTrigger>
              <SplitBarTrigger value="nutrition">Nutrition</SplitBarTrigger>
              <SplitBarTrigger value="exercise">Exercise</SplitBarTrigger>
              <SplitBarTrigger value="hydration">Hydration</SplitBarTrigger>
              <SplitBarTrigger value="sleep">Sleep</SplitBarTrigger>
              <SplitBarTrigger value="mental">Mental</SplitBarTrigger>
            </SplitBarList>
            
            <SplitBarContent value="all">
              {isLoading ? (
                <div className="text-center py-12 text-slate-600 dark:text-slate-400">
                  Loading plans...
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
                        <PersonalizedPlanCard type={planType as any} />
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
                  
                  {/* Enhanced Autopilot Summary Bar */}
                  <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-violet-500/10 border border-indigo-200/60 dark:border-indigo-800/60 backdrop-blur-md p-6 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                        🧠 Autopilot Summary
                      </h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          <VitanaScoreTooltip score={autopilotData.vitanaScore}>
                            <button className="hover:text-foreground transition-colors font-semibold">
                              {autopilotData.vitanaScore} Vitana Score
                            </button>
                          </VitanaScoreTooltip>
                          <span> · 5 active plans synced · Cross-pillar synergy {autopilotData.synergyScore}/100</span>
                        </div>
                        <div>Next recalibration: <span className="font-medium">{autopilotData.nextRecalibration}</span> · Adjustment: {autopilotData.lastAdjustment}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                        ⚙ Recalibrate All
                      </button>
                      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-lg transition-colors">
                        📈 View Detailed Report
                      </button>
                      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-lg transition-colors">
                        ✨ Optimize Weakest Pillar
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
        onOpenChange={setWizardOpen}
      />
    </AppLayout>
  );
}, SCREEN_IDS.HEALTH_PLANS);
