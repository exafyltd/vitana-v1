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
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        {/* Inner Container */}
        <div className="max-w-7xl mx-auto">
          
          <StandardHeader
            title="Your Personalized Health Plans"
            description="AI-powered plans tailored to your unique health profile and goals"
            emoji="🎯"
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
              {/* Content Grid Container */}
              <div className="grid grid-cols-12 gap-6">
                {isLoading ? (
                  <div className="col-span-12 text-center py-12">
                    <p className="text-muted-foreground">Loading plans...</p>
                  </div>
                ) : (
                  <>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="nutrition" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="exercise" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="hydration" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="sleep" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="mental" />
                    </div>
                    <div className="col-span-12 md:col-span-6 lg:col-span-4">
                      <PersonalizedPlanCard type="supplement" />
                    </div>
                  </>
                )}
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
            
            {/* Other plan type tabs */}
            {['mental', 'supplement'].map(type => (
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
