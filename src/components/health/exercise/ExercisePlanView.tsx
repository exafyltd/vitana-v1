import { useState } from "react";
import { ExercisePlanData } from "@/types/exercise";
import { ExerciseOverviewCard } from "./ExerciseOverviewCard";
import { WorkoutCard } from "./WorkoutCard";
import { WorkoutModal } from "./WorkoutModal";
import { ProgressDashboard } from "./ProgressDashboard";
import { ExerciseEmptyState } from "./ExerciseEmptyState";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { mockExercisePlan } from "@/data/mockExercise";
import { Workout } from "@/types/exercise";
import { t } from '@/lib/i18n-toast';

export function ExercisePlanView() {
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  
  const { plans } = useHealthPlans();
  const exercisePlan = plans?.find(p => p.plan_type === 'exercise');
  
  const planData = (exercisePlan?.plan_data as unknown as ExercisePlanData) || mockExercisePlan;
  
  if (!planData?.isGenerated) {
    return <ExerciseEmptyState />;
  }
  
  return (
    <>
      <div className="space-y-6">
        <ExerciseOverviewCard 
          planData={planData}
          onRecalibrate={() => {
            console.log('Recalibrate plan');
          }}
        />
        
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('screens.health.yourWeeklyWorkouts')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planData.workouts.map(workout => (
              <WorkoutCard
                key={workout.workoutId}
                workout={workout}
                onClick={() => setSelectedWorkout(workout)}
              />
            ))}
          </div>
        </div>
        
        <ProgressDashboard 
          progress={planData.progress}
          aiSummary="Consistency is excellent! Hydration and sleep scores are enhancing your recovery."
        />
      </div>
      
      <WorkoutModal
        workout={selectedWorkout}
        open={!!selectedWorkout}
        onOpenChange={(open) => !open && setSelectedWorkout(null)}
      />
    </>
  );
}
