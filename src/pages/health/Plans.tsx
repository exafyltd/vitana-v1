import { useState } from "react";
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

export default withScreenId(function Plans() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { isLoading } = useHealthPlans();
  
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
          
          {/* Autopilot Summary Subheader */}
          <div className="flex items-center justify-end gap-3 mb-6 text-sm italic text-slate-500/90 dark:text-slate-400/80">
            <span className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <span>Autopilot Summary</span>
            </span>
            <span className="font-medium">742 VITANA Score · 5 Active Plans · Fully Synced with AI Context</span>
          </div>
          
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
              {/* Content Grid Container with Animation Stagger */}
              <div className="grid grid-cols-12 gap-6 mb-8">
                {isLoading ? (
                  <div className="col-span-12 text-center py-12">
                    <p className="text-muted-foreground">Loading plans...</p>
                  </div>
                ) : (
                  <>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '0ms' }}>
                      <PersonalizedPlanCard type="nutrition" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                      <PersonalizedPlanCard type="exercise" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
                      <PersonalizedPlanCard type="hydration" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
                      <PersonalizedPlanCard type="sleep" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
                      <PersonalizedPlanCard type="mental" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4 animate-fade-in" style={{ animationDelay: '500ms' }}>
                      <PersonalizedPlanCard type="supplement" />
                    </div>
                  </>
                )}
              </div>
              
              {/* Unified Autopilot Bar */}
              <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-indigo-500/10 dark:from-indigo-600/20 dark:via-cyan-600/20 dark:to-indigo-600/20 backdrop-blur-md border border-indigo-200/60 dark:border-indigo-800/60 p-6 shadow-lg shadow-indigo-100/40 dark:shadow-indigo-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                      🤖 Autopilot Summary
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      All plans calibrated to your 742 Vitana Index · Last recalibrated 3h ago
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700"
                    >
                      ⚙️ Recalibrate All
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                    >
                      📈 View Progress Report
                    </Button>
                  </div>
                </div>
              </div>
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
