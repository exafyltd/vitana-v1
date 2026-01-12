import { Target } from "lucide-react";

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
  explanation = "This area currently has the biggest impact on your long-term healthspan."
}: MobilePriorityFocusProps) {
  return (
    <div className="mx-4 mt-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground/80">Priority Focus</span>
      </div>

      {/* Focus Card */}
      <div 
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(135deg, hsl(216, 53%, 10%) 0%, hsl(222, 47%, 13%) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Pillar Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{pillarEmoji}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-white">{pillarName}</span>
            <span className="text-amber-400 font-medium">{pillarScore}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
            style={{ width: `${pillarScore}%` }}
          />
        </div>

        {/* Explanation */}
        <p className="text-sm text-white/60 leading-relaxed">
          {explanation}
        </p>
      </div>
    </div>
  );
}
