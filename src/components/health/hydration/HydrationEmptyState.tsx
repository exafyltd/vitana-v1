import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { useTranslation } from "@/hooks/useTranslation";

export function HydrationEmptyState() {
  const { generatePlan } = useHealthPlans();
  const { translate } = useTranslation();
  
  return (
    <Card className="relative p-12 text-center overflow-hidden bg-gradient-to-br from-[#f9fdff] to-[#f1faff]
      dark:from-slate-900 dark:to-slate-800
      before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.05)_0%,transparent_60%)]
      before:pointer-events-none">
      <div className="max-w-md mx-auto space-y-4">
        <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/20 rounded-full flex items-center justify-center mx-auto">
          <Droplets className="w-10 h-10 text-cyan-600 dark:text-cyan-400" />
        </div>
        
        <h3 className="text-xl font-semibold">
          {translate('health.emptyStates.noHydrationPlan', 'No Hydration Plan Yet')}
        </h3>
        <p className="text-muted-foreground">
          {translate('health.emptyStates.noHydrationPlanDesc', 'Generate your personalized hydration plan with AI-optimized daily targets tailored to your activity level, environment, and recovery needs.')}
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
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
        >
          {generatePlan.isPending 
            ? translate('health.emptyStates.generating', 'Generating...') 
            : translate('health.emptyStates.generatePlan', 'Generate Hydration Plan')}
        </Button>
      </div>
    </Card>
  );
}
