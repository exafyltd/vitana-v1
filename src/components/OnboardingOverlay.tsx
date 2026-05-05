import { useState, useEffect } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";
import { useTenant } from "@/hooks/useTenant";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Apple, Heart, Target, Users, CheckCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface OnboardingOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items?: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to VITANA",
    description: "Your AI-powered wellness journey starts here. Let's personalize your experience.",
    icon: <Heart className="w-8 h-8 text-red-400" />,
  },
  {
    id: "connect",
    title: "Connect Your Apps",
    description: "VITANA works best when connected to your favorite health and social apps.",
    icon: <Apple className="w-8 h-8 text-green-600" />,
    items: ["YouTube", "LinkedIn", "Strava", "Apple Health (Coming Soon)", "Google Fit (Coming Soon)"]
  },
  {
    id: "goals",
    title: "Set Your Goals",
    description: "Choose what matters most to you right now.",
    icon: <Target className="w-8 h-8 text-blue-500" />,
    items: ["Improve sleep quality", "Build exercise habits", "Better nutrition", "Stress management", "Social wellness"]
  },
  {
    id: "community",
    title: "Join the Community",
    description: "Find your tribe and share your wellness journey.",
    icon: <Users className="w-8 h-8 text-purple-500" />,
    items: ["Wellness Beginners", "Fitness Enthusiasts", "Mindful Living", "Nutrition Focus", "Sleep Optimization"]
  }
];

export default function OnboardingOverlay({ open, onOpenChange }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const { tenant } = useTenant();

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      // Mark onboarding as completed using namespaced localStorage
      setLocalStorageItem(tenant.id, "onboarding", "completed", "true");
      onOpenChange(false);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleItemToggle = (item: string) => {
    const currentSelections = getCurrentSelections();
    const setCurrentSelections = getCurrentSetFunction();
    
    if (currentSelections.includes(item)) {
      setCurrentSelections(currentSelections.filter(i => i !== item));
    } else {
      setCurrentSelections([...currentSelections, item]);
    }
  };

  const getCurrentSelections = () => {
    switch (step.id) {
      case "connect": return selectedConnections;
      case "goals": return selectedGoals;
      case "community": return selectedCommunities;
      default: return [];
    }
  };

  const getCurrentSetFunction = () => {
    switch (step.id) {
      case "connect": return setSelectedConnections;
      case "goals": return setSelectedGoals;
      case "community": return setSelectedCommunities;
      default: return () => {};
    }
  };

  const getItemIcon = (item: string) => {
    if (item.includes("Instagram") || item.includes("TikTok")) return <Instagram className="w-4 h-4" />;
    if (item.includes("Apple") || item.includes("Google")) return <Apple className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {step.icon}
            <div>
              <DialogTitle className="text-left">{step.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-6">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4 mb-6">
          {step.items ? (
            <div className="space-y-2">
              {step.items.map((item) => {
                const isSelected = getCurrentSelections().includes(item);
                return (
                  <Button
                    key={item}
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full justify-start gap-3 h-auto py-3 ${
                      item.includes("Coming Soon") ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => !item.includes("Coming Soon") && handleItemToggle(item)}
                    disabled={item.includes("Coming Soon")}
                  >
                    {getItemIcon(item)}
                    <span className="flex-1 text-left">{item}</span>
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs">
                        Selected
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('screens.common.readyBeginYourWellnessJourney')}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              Previous
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? "Get Started" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}