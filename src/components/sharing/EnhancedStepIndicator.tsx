import { FileText, Share2, Zap, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepConfig {
  number: number;
  label: string;
  icon: React.ReactNode;
}

interface EnhancedStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

export function EnhancedStepIndicator({ currentStep, totalSteps, onStepClick }: EnhancedStepIndicatorProps) {
  // Fixed 4-step flow: Basics → Channels → Template → Schedule
  const steps: StepConfig[] = [
    { number: 1, label: "Basics", icon: <FileText className="w-4 h-4" /> },
    { number: 2, label: "Channels", icon: <Share2 className="w-4 h-4" /> },
    { number: 3, label: "Template", icon: <Zap className="w-4 h-4" /> },
    { number: 4, label: "Schedule", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="relative py-6">
      {/* Vitana gradient progress bar */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted rounded-full">
        <div 
          className="h-full bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
      
      {/* Step circles with labels */}
      <div className="relative flex justify-between">
        {steps.map((step) => (
          <button
            key={step.number}
            onClick={() => onStepClick?.(step.number)}
            className={cn(
              "flex flex-col items-center gap-2 group",
              step.number > currentStep && "cursor-not-allowed opacity-50"
            )}
            disabled={step.number > currentStep}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
              step.number < currentStep && "bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] text-white shadow-lg",
              step.number === currentStep && "bg-gradient-to-r from-[hsl(var(--gradient-join-start))] to-[hsl(var(--gradient-join-end))] text-white shadow-xl ring-4 ring-[hsl(var(--gradient-join-start))]/20 scale-110",
              step.number > currentStep && "bg-background border-2 border-border text-muted-foreground"
            )}>
              {step.number < currentStep ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </div>
            <span className={cn(
              "text-xs font-medium transition-colors",
              step.number <= currentStep ? "text-foreground" : "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
