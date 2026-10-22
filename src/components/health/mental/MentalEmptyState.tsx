import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function MentalEmptyState() {
  const { translate } = useTranslation();
  
  return (
    <Card className="p-8 text-center bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to border border-border/60">
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-category-4/40 via-status-warning/40 to-category-1/40 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <Sparkles className="w-5 h-5 text-category-1 absolute -top-1 -end-1" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            {translate('health.emptyStates.noMentalPlan', 'No Mental Plan Yet')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translate('health.emptyStates.noMentalPlanDesc', 'Generate your personalized mental wellness plan to track stress, focus, and emotional balance with AI guidance.')}
          </p>
        </div>
        
        <Button className="mt-2">
          {translate('health.emptyStates.generatePlan', 'Generate Mental Plan')}
        </Button>
      </div>
    </Card>
  );
}
