import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function NutritionEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="p-12 text-center border-2 border-dashed">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Apple className="w-10 h-10 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noNutritionPlan')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noNutritionPlanDesc')}
        </p>
        
        <Button
          size="lg"
          onClick={() => {
            generatePlan.mutate({
              planType: 'nutrition',
              userContext: { vitanaScore: 75, weakestPillar: 'nutrition' }
            });
          }}
          disabled={generatePlan.isPending}
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating') 
            : translate('health.emptyStates.generatePlan')}
        </Button>
      </div>
    </Card>
  );
}
