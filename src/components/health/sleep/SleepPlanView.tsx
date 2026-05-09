import { useState } from "react";
import { SleepPlanData, DailySleepData } from "@/types/sleep";
import { SleepOverviewCard } from "./SleepOverviewCard";
import { DailySleepCard } from "./DailySleepCard";
import { SleepModal } from "./SleepModal";
import { SleepDashboard } from "./SleepDashboard";
import { SleepEmptyState } from "./SleepEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockSleepPlan } from "@/data/mockSleep";
import { t } from '@/lib/i18n-toast';

export function SleepPlanView() {
  const [selectedDay, setSelectedDay] = useState<DailySleepData | null>(null);
  
  const { plans } = useHealthPlans();
  const sleepPlan = plans?.find(p => p.plan_type === 'sleep');
  
  const planData = (sleepPlan?.plan_data as unknown as SleepPlanData) || mockSleepPlan;
  
  if (!planData?.isGenerated) {
    return <SleepEmptyState />;
  }
  
  const daysWithGoodSleep = planData.dailyStats.filter(d => d.sleepScore >= 70).length;
  const totalDays = planData.dailyStats.length;
  const avgScore = Math.round(planData.dailyStats.reduce((sum, day) => sum + day.sleepScore, 0) / totalDays);
  
  return (
    <>
      <div className="space-y-6">
        <SleepOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate sleep plan');
          }}
        />
        
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
          <h3 className="text-xl font-semibold tracking-tight mb-4">{t('screens.health.yourDailySleepTracking')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planData.dailyStats.map(dayData => (
              <DailySleepCard
                key={dayData.dayId}
                data={dayData}
                onClick={() => setSelectedDay(dayData)}
              />
            ))}
          </div>
          
          {/* Summary Strip */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('screens.health.averageSleepQualityAvgscore100Deep', { avgScore, deepSleepPercentage: planData.progress.deepSleepPercentage, consistencyTrend: planData.progress.consistencyTrend, recoveryImpact: planData.progress.recoveryImpact })}</p>
          </div>
        </div>
        
        <SleepDashboard 
          progress={planData.progress}
          aiSummary="Sleep consistency improved +10% this week — great recovery trend. AI detected your optimal bedtime window is 22:30-23:00 for maximum deep sleep."
        />
      </div>
      
      <SleepModal
        data={selectedDay}
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </>
  );
}
