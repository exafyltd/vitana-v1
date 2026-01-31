import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function SleepEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="p-12 text-center bg-gradient-to-br from-[hsl(230,100%,90%)]/30 via-[hsl(270,50%,90%)]/40 to-[hsl(210,100%,97%)]/40 
      dark:from-[hsl(222,61%,7%)]/90 dark:via-[hsl(230,32%,11%)]/90 dark:to-[hsl(216,31%,15%)]/90">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto">
          <Moon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
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
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating') 
            : translate('health.emptyStates.generatePlan')}
        </Button>
      </div>
    </Card>
  );
}
