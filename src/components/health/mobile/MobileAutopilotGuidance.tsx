import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

interface MobileAutopilotGuidanceProps {
  suggestions: string[];
  onTakeAction: () => void;
}

export function MobileAutopilotGuidance({ 
  suggestions, 
  onTakeAction 
}: MobileAutopilotGuidanceProps) {
  const { translate } = useTranslation();
  
  // Limit to max 2 suggestions
  const displaySuggestions = suggestions.slice(0, 2);

  return (
    <div className="mx-4 mt-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Plane className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground/80">{translate('health.autopilotSuggests')}</span>
      </div>

      {/* Suggestions Card */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm">
        {/* Bullet Points */}
        <ul className="space-y-2 mb-4">
          {displaySuggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-pill-nutrition-accent mt-0.5">•</span>
              <span className="text-sm text-foreground/80">{suggestion}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button — soft pastel gradient mirroring the Index drawer */}
        <Button
          onClick={onTakeAction}
          className="w-full bg-gradient-to-r from-green-400/80 to-blue-500/80 text-white hover:from-green-500 hover:to-blue-500"
        >
          {translate('health.takeAction')}
        </Button>
      </div>
    </div>
  );
}
