import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function SleepEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="p-12 text-center bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-category-3/15 rounded-full flex items-center justify-center mx-auto">
          <Moon className="w-10 h-10 text-category-3" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noSleepPlan')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noSleepPlanDesc')}
        </p>
        
        <Button
          size="lg"
          onClick={() => {
            generatePlan.mutate({
              planType: 'sleep',
              userContext: { vitanaScore: 75, weakestPillar: 'sleep' }
            });
          }}
          disabled={generatePlan.isPending}
          className="bg-gradient-to-r from-category-3 to-category-2 hover:from-category-3 hover:to-category-2"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating') 
            : translate('health.emptyStates.generatePlan')}
        </Button>
      </div>
    </Card>
  );
}
