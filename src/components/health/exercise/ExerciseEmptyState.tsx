import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function ExerciseEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="p-12 text-center bg-gradient-to-br from-category-3/5 to-category-1/5 
">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-category-3/15 rounded-full flex items-center justify-center mx-auto">
          <Dumbbell className="w-10 h-10 text-category-3" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noExercisePlan')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noExercisePlanDesc')}
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
          className="bg-gradient-to-r from-category-3 to-category-1 hover:from-category-3 hover:to-category-1"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating') 
            : translate('health.emptyStates.generatePlan')}
        </Button>
      </div>
    </Card>
  );
}
