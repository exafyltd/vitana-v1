import { Target } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface MobilePriorityFocusProps {
  pillarName: string;
  pillarScore: number;
  pillarEmoji: string;
  explanation?: string;
}

export function MobilePriorityFocus({ 
  pillarName, 
  pillarScore, 
  pillarEmoji,
  explanation
}: MobilePriorityFocusProps) {
  const { translate } = useTranslation();
  
  // Use provided explanation or fall back to translated default
  const displayExplanation = explanation || translate('health.priorityFocusExplanation');

  return (
    <div className="mx-4 mt-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground/80">{translate('health.priorityFocus')}</span>
      </div>

      {/* Focus Card */}
      <div className="rounded-xl p-4 bg-card border border-border/60 shadow-sm">
        {/* Pillar Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{pillarEmoji}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-foreground">{pillarName}</span>
            <span className="text-amber-600 font-medium">{pillarScore}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
            style={{ width: `${pillarScore}%` }}
          />
        </div>

        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {displayExplanation}
        </p>
      </div>
    </div>
  );
}
