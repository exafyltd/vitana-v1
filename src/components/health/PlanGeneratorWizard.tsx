import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Apple, Dumbbell, Droplet, Moon, Brain, Plus, Sparkles } from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { t } from '@/lib/i18n-toast';

const PLAN_OPTIONS = [
  { value: 'nutrition', label: 'Nutrition Plan', icon: Apple, description: 'Personalized meal planning and nutrition guidance' },
  { value: 'exercise', label: 'Exercise Plan', icon: Dumbbell, description: 'Workout routines tailored to your fitness level' },
  { value: 'hydration', label: 'Hydration Plan', icon: Droplet, description: 'Daily water intake goals and reminders' },
  { value: 'sleep', label: 'Sleep Plan', icon: Moon, description: 'Sleep optimization and bedtime routines' },
  { value: 'mental', label: 'Mental Wellness', icon: Brain, description: 'Mindfulness and stress management practices' },
  { value: 'supplement', label: 'Supplement Plan', icon: Plus, description: 'Personalized supplement recommendations' },
];

interface PlanGeneratorWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanType?: string;
}

export function PlanGeneratorWizard({ open, onOpenChange, defaultPlanType }: PlanGeneratorWizardProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(defaultPlanType || 'nutrition');
  const { generatePlan } = useHealthPlans();
  
  useEffect(() => {
    if (defaultPlanType) {
      setSelectedPlan(defaultPlanType);
    }
  }, [defaultPlanType]);
  
  const handleGenerate = () => {
    generatePlan.mutate({
      planType: selectedPlan,
      userContext: {
        vitanaScore: 75,
        weakestPillar: selectedPlan
      }
    });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {defaultPlanType 
              ? `Generate ${PLAN_OPTIONS.find(o => o.value === defaultPlanType)?.label || 'Health Plan'}`
              : 'Generate AI-Powered Health Plan'
            }
          </DialogTitle>
          <DialogDescription>
            {defaultPlanType
              ? `Create a personalized ${PLAN_OPTIONS.find(o => o.value === defaultPlanType)?.label.toLowerCase()} tailored to your health profile`
              : "Select the type of personalized health plan you'd like to create"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLAN_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="relative">
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-semibold">{option.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {option.description}
                      </p>
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.health.cancel')}
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={generatePlan.isPending}
          >
            {generatePlan.isPending ? 'Generating...' : 'Generate Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
