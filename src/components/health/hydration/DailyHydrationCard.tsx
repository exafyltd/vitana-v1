import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DailyHydrationData } from "@/types/hydration";
import { Droplets, Clock, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface DailyHydrationCardProps {
  data: DailyHydrationData;
  onClick: () => void;
}

export function DailyHydrationCard({ data, onClick }: DailyHydrationCardProps) {
  const isComplete = data.completionPercentage >= 100;
  const isOnTrack = data.completionPercentage >= 80;
  const isBelowHalf = data.completionPercentage < 50;
  const hasAINote = !!data.aiNote;
  
  const getStatusText = () => {
    if (isComplete) return "Goal Met";
    if (isBelowHalf) return "Catch-up needed";
    if (!isOnTrack) return "Below target";
    return "On track";
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] motion-reduce:hover:translate-y-0 relative rounded-xl border border-border shadow-sm",
        "bg-gradient-to-br from-surface-page-from to-surface-page-via",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.06)_0%,transparent_60%)]",
        "before:pointer-events-none before:opacity-60 group-hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}
      onClick={onClick}
    >
      {/* Card Content */}
      <div className="p-4 md:p-5">
        {/* Header Row */}
        <div className="flex items-center justify-between min-h-10 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-foreground">
              {data.day}
            </span>
            <span className="text-[13px] text-muted-foreground font-normal">
              {fmtDate(new Date(data.date), { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasAINote && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-sunken text-[11px] text-muted-foreground px-2 py-0.5">
                <Brain className="w-3 h-3" />
                AI
              </span>
            )}
            <Droplets 
              className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                isComplete ? "text-category-1" : isOnTrack ? "text-category-1" : "text-muted-foreground"
              )} 
            />
          </div>
        </div>
        
        {/* Status Badge (if complete or below half) */}
        {(isComplete || isBelowHalf) && (
          <div className="mb-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              isComplete 
                ? "bg-status-success-subtle text-status-success border-status-success/25" 
                : "bg-status-warning-subtle text-status-warning border-status-warning/25"
            )}>
              {isComplete && <Sparkles className="w-3 h-3" />}
              {getStatusText()}
            </span>
          </div>
        )}
        
        {/* Intake Progress */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[12px] mb-1 text-muted-foreground">
            <span>{t('screens.health.intake')}</span>
            <span className="font-medium">
              {(data.currentAmount / 1000).toFixed(1)}L / {(data.targetAmount / 1000).toFixed(1)}L
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div 
              className="h-full bg-category-1 transition-all ease-in-out duration-500 rounded-full relative overflow-hidden
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-card/40 before:to-transparent
                before:animate-[shimmer_2s_ease-in-out_infinite] before:translate-x-[-100%]"
              style={{ width: `${data.completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-muted-foreground">{t('screens.health.completionpercentageComplete', { completionPercentage: data.completionPercentage })}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {!isComplete && !isBelowHalf && getStatusText()}
            </span>
          </div>
        </div>
        
        {/* Next Reminder */}
        <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{data.nextReminder}</span>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {data.tags.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-[11px] text-muted-foreground capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* AI Note */}
        {data.aiNote && (
          <div className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
            {data.aiNote}
          </div>
        )}
      </div>
    </Card>
  );
}
