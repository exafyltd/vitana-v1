import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function HydrationEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="relative p-12 text-center overflow-hidden bg-gradient-to-br from-surface-page-from to-surface-page-via
      before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.05)_0%,transparent_60%)]
      before:pointer-events-none">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-category-1/15 rounded-full flex items-center justify-center mx-auto">
          <Droplets className="w-10 h-10 text-category-1" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noHydrationPlan')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noHydrationPlanDesc')}
        </p>
        
        <Button
          size="lg"
          onClick={() => {
            generatePlan.mutate({
              planType: 'hydration',
              userContext: { vitanaScore: 75, weakestPillar: 'hydration' }
            });
          }}
          disabled={generatePlan.isPending}
          className="bg-gradient-to-r from-category-1 to-category-3 hover:from-category-1 hover:to-category-3"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating') 
            : translate('health.emptyStates.generatePlan')}
        </Button>
      </div>
    </Card>
  );
}
