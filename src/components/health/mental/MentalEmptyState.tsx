import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function MentalEmptyState() {
  const { translate } = useTranslation();
  
  return (
    <Card className="p-8 text-center bg-gradient-to-br from-[#FDE2E4]/60 via-[#FAD4C0]/60 to-[#CDEDF6]/60 dark:from-[#1A1013]/90 dark:via-[#1E1C1B]/90 dark:to-[#122025]/90 border border-slate-200/60 dark:border-slate-800/60">
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-300 via-orange-300 to-teal-300 flex items-center justify-center">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <Sparkles className="w-5 h-5 text-teal-500 absolute -top-1 -right-1" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight">
            {translate('health.emptyStates.noMentalPlan', 'No Mental Plan Yet')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
