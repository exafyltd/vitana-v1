import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function ExerciseEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="p-12 text-center bg-gradient-to-br from-blue-50/50 to-cyan-50/50 
      dark:from-slate-900/50 dark:to-slate-800/50">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto">
          <Dumbbell className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noExercisePlan', 'No Exercise Plan Yet')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noExercisePlanDesc', 'Generate your personalized workout plan with AI-optimized exercises tailored to your fitness level, goals, and recovery needs.')}
        </p>
        
        <Button
          size="lg"
          onClick={() => {
            generatePlan.mutate({
              planType: 'exercise',
              userContext: { vitanaScore: 75, weakestPillar: 'exercise' }
            });
          }}
          disabled={generatePlan.isPending}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating', 'Generating...') 
            : translate('health.emptyStates.generatePlan', 'Generate Exercise Plan')}
        </Button>
      </div>
    </Card>
  );
}
