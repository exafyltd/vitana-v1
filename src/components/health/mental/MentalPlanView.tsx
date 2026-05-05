import { useState } from "react";
import { MentalPlanData, DailyMentalData } from "@/types/mental";
import { MentalOverviewCard } from "./MentalOverviewCard";
import { DailyMentalCard } from "./DailyMentalCard";
import { MentalModal } from "./MentalModal";
import { MentalDashboard } from "./MentalDashboard";
import { MentalCoachWidget } from "./MentalCoachWidget";
import { MentalEmptyState } from "./MentalEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockMentalPlan } from "@/data/mockMental";
import { t } from '@/lib/i18n-toast';

export function MentalPlanView() {
  const [selectedDay, setSelectedDay] = useState<DailyMentalData | null>(null);
  
  const { plans } = useHealthPlans();
  const mentalPlan = plans?.find(p => p.plan_type === 'mental');
  
  const planData = (mentalPlan?.plan_data as unknown as MentalPlanData) || mockMentalPlan;
  
  if (!planData?.isGenerated) {
    return <MentalEmptyState />;
  }
  
  return (
    <>
      <div className="space-y-6">
        <MentalOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate mental plan');
          }}
        />
        
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
          <h3 className="text-xl font-semibold tracking-tight mb-4">{t('screens.health.yourDailyMindTracking')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planData.dailyStats.map(dayData => (
              <DailyMentalCard
                key={dayData.dayId}
                data={dayData}
                onClick={() => setSelectedDay(dayData)}
              />
            ))}
          </div>
          
          {/* Summary Strip */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('screens.health.avgMoodAvgmoodindexFocusFocusstabilityFocusstabili', { avgMoodIndex: planData.progress.avgMoodIndex, focusStability: planData.progress.focusStability, focusStabilityTrend: planData.progress.focusStabilityTrend, stressRecovery: planData.progress.stressRecovery, mindfulnessStreak: planData.progress.mindfulnessStreak })}
            </p>
          </div>
        </div>
        
        <MentalDashboard 
          progress={planData.progress}
          aiSummary="Stress indicators improved by +12% since introducing morning breathwork. Your focus variability decreased — excellent progress this week."
        />
        
        {planData.coachMessage && (
          <MentalCoachWidget message={planData.coachMessage} />
        )}
      </div>
      
      <MentalModal
        data={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </>
  );
}
