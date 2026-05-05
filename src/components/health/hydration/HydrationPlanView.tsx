import { useState } from "react";
import { HydrationPlanData, DailyHydrationData } from "@/types/hydration";
import { HydrationOverviewCard } from "./HydrationOverviewCard";
import { DailyHydrationCard } from "./DailyHydrationCard";
import { HydrationModal } from "./HydrationModal";
import { HydrationDashboard } from "./HydrationDashboard";
import { HydrationEmptyState } from "./HydrationEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockHydrationPlan } from "@/data/mockHydration";
import { t } from '@/lib/i18n-toast';

export function HydrationPlanView() {
  const [selectedDay, setSelectedDay] = useState<DailyHydrationData | null>(null);
  
  const { plans } = useHealthPlans();
  const hydrationPlan = plans?.find(p => p.plan_type === 'hydration');
  
  const planData = (hydrationPlan?.plan_data as unknown as HydrationPlanData) || mockHydrationPlan;
  
  if (!planData?.isGenerated) {
    return <HydrationEmptyState />;
  }
  
  const daysCompleted = planData.dailyStats.filter(d => d.completionPercentage >= 100).length;
  const totalDays = planData.dailyStats.length;
  const energyImpact = planData.progress.recoveryImpact;
  
  return (
    <>
      <div className="space-y-6">
        <HydrationOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate hydration plan');
          }}
        />
        
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
          <h3 className="text-xl font-semibold tracking-tight mb-4">{t('screens.health.yourDailyHydrationTracking')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planData.dailyStats.map(dayData => (
              <DailyHydrationCard
                key={dayData.dayId}
                data={dayData}
                onClick={() => setSelectedDay(dayData)}
              />
            ))}
          </div>
          
          {/* Summary Strip */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('screens.health.youVeMetYourHydrationGoal', { daysCompleted, totalDays, energyImpact })}
            </p>
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
