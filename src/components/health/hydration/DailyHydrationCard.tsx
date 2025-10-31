import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DailyHydrationData } from "@/types/hydration";
import { Droplets, Clock, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyHydrationCardProps {
  data: DailyHydrationData;
  onClick: () => void;
}

export function DailyHydrationCard({ data, onClick }: DailyHydrationCardProps) {
  const isComplete = data.completionPercentage >= 100;
  const isOnTrack = data.completionPercentage >= 80;
  const isBelowHalf = data.completionPercentage < 50;
  const hasAINote = !!data.aiNote;
  
  const getBorderClass = () => {
    if (isComplete) return "border-2 border-transparent bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/20";
    if (isBelowHalf) return "border border-amber-200 dark:border-amber-700/50";
    if (!isOnTrack) return "border border-sky-200 dark:border-sky-800/50";
    return "border border-slate-200 dark:border-slate-800";
  };
  
  const getStatusText = () => {
    if (isComplete) return "Hydration level optimal";
    if (isBelowHalf) return "Catch-up needed";
    if (!isOnTrack) return "Below target";
    return "On track";
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-100/20 dark:hover:shadow-cyan-900/20 hover:-translate-y-1 hover:ring-1 hover:ring-sky-300/50 dark:hover:ring-sky-500/40 relative rounded-2xl",
        getBorderClass(),
        hasAINote && "ring-2 ring-cyan-500/50 ring-offset-2"
      )}
      onClick={onClick}
    >
      {/* AI Badge (if applicable) */}
      {hasAINote && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="gap-1 bg-cyan-500/90 text-white backdrop-blur-sm animate-pulse">
            <Brain className="w-3 h-3" />
            AI
          </Badge>
        </div>
      )}
      
      {/* Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-bold text-lg">{data.day}</h4>
            <p className="text-xs text-muted-foreground">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <Droplets 
            className={cn(
              "w-8 h-8 transition-colors",
              isComplete ? "text-cyan-500" : isOnTrack ? "text-sky-500" : "text-slate-400"
            )} 
          />
        </div>
        
        {/* Intake Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">Intake</span>
            <span className="font-bold">
              {(data.currentAmount / 1000).toFixed(1)}L / {(data.targetAmount / 1000).toFixed(1)}L
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800/50">
            <div 
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-500 opacity-80 transition-all ease-in-out duration-1200 rounded-full"
              style={{ width: `${data.completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">
              {data.completionPercentage}% complete
            </p>
            <p className={cn(
              "text-xs font-medium",
              isComplete ? "text-emerald-600 dark:text-emerald-400" : 
              isBelowHalf ? "text-amber-600 dark:text-amber-400" : 
              "text-slate-500 dark:text-slate-400"
            )}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {/* Next Reminder */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{data.nextReminder}</span>
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs capitalize">
              {tag}
            </Badge>
          ))}
        </div>
        
        {/* AI Note */}
        {data.aiNote && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-start gap-2">
              <Brain className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground italic">
                {data.aiNote}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Completion Badge Overlay */}
      {isComplete && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-cyan-500 hover:bg-cyan-600 gap-1">
            <Sparkles className="w-3 h-3" />
            Goal Met
          </Badge>
        </div>
      )}
    </Card>
  );
}
