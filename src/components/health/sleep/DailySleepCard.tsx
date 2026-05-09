import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DailySleepData } from "@/types/sleep";
import { Moon, Clock, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface DailySleepCardProps {
  data: DailySleepData;
  onClick: () => void;
}

export function DailySleepCard({ data, onClick }: DailySleepCardProps) {
  const isExcellent = data.sleepScore >= 85;
  const isGood = data.sleepScore >= 70 && data.sleepScore < 85;
  const isBelowTarget = data.sleepScore < 70;
  const hasAINote = !!data.aiNote;
  
  // Determine border based on score
  const getBorderClass = () => {
    if (isExcellent) return 'border-emerald-200 dark:border-emerald-800';
    if (isGood) return 'border-sky-200 dark:border-sky-800';
    return 'border-amber-200 dark:border-amber-700';
  };
  
  const getStatusText = () => {
    if (isExcellent) return 'Sleep quality excellent';
    if (isGood) return 'Sleep quality good';
    return 'Room for improvement';
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:shadow-indigo-100/20 dark:hover:shadow-indigo-900/20 hover:-translate-y-[2px] hover:ring-1 hover:ring-indigo-300/30 dark:hover:ring-indigo-700/40 relative border rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-sm shadow-indigo-100/30 dark:shadow-indigo-900/20",
        getBorderClass(),
        hasAINote && "ring-2 ring-indigo-500/50 ring-offset-2",
        isExcellent && "bg-gradient-to-br from-emerald-50/50 to-indigo-50/50 dark:from-emerald-950/10 dark:to-indigo-950/10"
      )}
      onClick={onClick}
    >
      {/* AI Badge (if applicable) */}
      {hasAINote && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="gap-1 bg-indigo-500/90 text-white backdrop-blur-sm animate-pulse">
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
            <h4 className="text-base font-semibold text-indigo-700 dark:text-indigo-300">{data.day}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">{new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <Moon 
            className={cn(
              "w-8 h-8 transition-all duration-1200 ease-in-out",
              isExcellent ? "text-indigo-500 animate-pulse" : isGood ? "text-purple-500" : "text-slate-400"
            )}
            style={{ opacity: isExcellent ? 1 : 0.8 }}
          />
        </div>
        
        {/* Sleep Duration & Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium">{data.duration}</span>
            <span className="font-bold">{t('screens.health.scoreSleepscore100', { sleepScore: data.sleepScore })}
            </span>
          </div>
          <Progress 
            value={data.sleepScore} 
            className="h-2.5 transition-all ease-in-out duration-1200"
            style={{
              background: 'rgb(226 232 240 / 0.5)'
            }}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1.5">
            {getStatusText()}
          </p>
        </div>
        
        {/* Bedtime */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">{t('screens.health.bedtimeBedtimeWakeWaketime', { bedtime: data.bedtime, wakeTime: data.wakeTime })}</span>
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
              <Brain className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                {data.aiNote}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Excellence Badge Overlay */}
      {isExcellent && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-xs font-semibold px-2 py-1 rounded-full gap-1 border-0">
            <Sparkles className="w-3 h-3" />
            {t('screens.health.excellent')}
          </Badge>
        </div>
      )}
    </Card>
  );
}
