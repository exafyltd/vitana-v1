import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CookModeStepsProps {
  steps: string[];
}

export function CookModeSteps({ steps }: CookModeStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  return (
    <div className="bg-muted/50 rounded-lg p-6 border border-border">
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t('screens.health.stepValue0Length', { value0: currentStep + 1, length: steps.length })}</p>
        <Progress value={((currentStep + 1) / steps.length) * 100} className="h-2" />
      </div>
      
      <p className="text-lg mb-6 min-h-[80px]">{steps[currentStep]}</p>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('screens.health.previous')}
        </Button>
        <Button
          variant="default"
          className="flex-1"
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
        >{t('screens.health.next')}
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
