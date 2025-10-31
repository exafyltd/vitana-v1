import { useState } from "react";
import { HydrationPlanData, DailyHydrationData } from "@/types/hydration";
import { HydrationOverviewCard } from "./HydrationOverviewCard";
import { DailyHydrationCard } from "./DailyHydrationCard";
import { HydrationModal } from "./HydrationModal";
import { HydrationDashboard } from "./HydrationDashboard";
import { HydrationEmptyState } from "./HydrationEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockHydrationPlan } from "@/data/mockHydration";

export function HydrationPlanView() {
  const [selectedDay, setSelectedDay] = useState<DailyHydrationData | null>(null);
  
  const { plans } = useHealthPlans();
  const hydrationPlan = plans?.find(p => p.plan_type === 'hydration');
  
  const planData = (hydrationPlan?.plan_data as unknown as HydrationPlanData) || mockHydrationPlan;
  
  if (!planData?.isGenerated) {
    return <HydrationEmptyState />;
  }
  
  return (
    <>
      <div className="space-y-6">
        <HydrationOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate hydration plan');
          }}
        />
        
        <div>
          <h3 className="text-lg font-semibold mb-4">Your Daily Hydration Tracking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planData.dailyStats.map(dayData => (
              <DailyHydrationCard
                key={dayData.dayId}
                data={dayData}
                onClick={() => setSelectedDay(dayData)}
              />
            ))}
          </div>
        </div>
        
        <HydrationDashboard 
          progress={planData.progress}
          aiSummary="Your hydration consistency improved +12% this week — great progress! AI recommends adding electrolytes after intense workouts for faster recovery."
        />
      </div>
      
      <HydrationModal
        data={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </>
  );
}
