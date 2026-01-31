import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileAutopilotGuidanceProps {
  suggestions: string[];
  onTakeAction: () => void;
}

export function MobileAutopilotGuidance({ 
  suggestions, 
  onTakeAction 
}: MobileAutopilotGuidanceProps) {
  // Limit to max 2 suggestions
  const displaySuggestions = suggestions.slice(0, 2);

  return (
    <div className="mx-4 mt-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Plane className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground/80">Autopilot Suggests</span>
      </div>

      {/* Suggestions Card */}
      <div 
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, hsl(216, 53%, 10%) 0%, hsl(222, 47%, 13%) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Bullet Points */}
        <ul className="space-y-2 mb-4">
          {displaySuggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span className="text-sm text-white/80">{suggestion}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button 
          onClick={onTakeAction}
          className="w-full bg-primary hover:bg-primary/90"
        >
          Take Action
        </Button>
      </div>
    </div>
  );
}
