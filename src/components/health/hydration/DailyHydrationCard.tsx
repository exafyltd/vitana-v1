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
        "group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-[1px] motion-reduce:hover:translate-y-0 relative rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm",
        "bg-gradient-to-br from-[#f9fdff] to-[#f1faff] dark:from-slate-900 dark:to-slate-800",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.06)_0%,transparent_60%)]",
        "before:pointer-events-none before:opacity-60 group-hover:before:opacity-100 before:transition-opacity before:duration-300"
      )}
      onClick={onClick}
    >
      {/* Card Content */}
      <div className="p-4 md:p-5">
        {/* Header Row */}
        <div className="flex items-center justify-between min-h-[40px] mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
              {data.day}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">
              {fmtDate(new Date(data.date), { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasAINote && (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 px-2 py-0.5">
                <Brain className="w-3 h-3" />
                AI
              </span>
            )}
            <Droplets 
              className={cn(
                "w-5 h-5 transition-colors flex-shrink-0",
                isComplete ? "text-cyan-600 dark:text-cyan-400" : isOnTrack ? "text-cyan-500 dark:text-cyan-500" : "text-slate-400 dark:text-slate-500"
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
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" 
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
            )}>
              {isComplete && <Sparkles className="w-3 h-3" />}
              {getStatusText()}
            </span>
          </div>
        )}
        
        {/* Intake Progress */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-[12px] mb-1 text-slate-700 dark:text-slate-300">
            <span>{t('screens.health.intake')}</span>
            <span className="font-medium">
              {(data.currentAmount / 1000).toFixed(1)}L / {(data.targetAmount / 1000).toFixed(1)}L
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div 
              className="h-full bg-cyan-600 dark:bg-cyan-500 transition-all ease-in-out duration-500 rounded-full relative overflow-hidden
                before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent
                before:animate-[shimmer_2s_ease-in-out_infinite] before:translate-x-[-100%]"
              style={{ width: `${data.completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('screens.health.completionpercentageComplete', { completionPercentage: data.completionPercentage })}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {!isComplete && !isBelowHalf && getStatusText()}
            </span>
          </div>
        </div>
        
        {/* Next Reminder */}
        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{data.nextReminder}</span>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {data.tags.map(tag => (
            <span 
              key={tag} 
              className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-300 capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* AI Note */}
        {data.aiNote && (
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
            {data.aiNote}
          </div>
        )}
      </div>
    </Card>
  );
}
