import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DailySleepData } from "@/types/sleep";
import { Moon, Clock, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
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
    if (isExcellent) return 'border-emerald-200';
    if (isGood) return 'border-sky-200';
    return 'border-amber-200';
  };
  
  const getStatusText = () => {
    if (isExcellent) return 'Sleep quality excellent';
    if (isGood) return 'Sleep quality good';
    return 'Room for improvement';
  };
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:shadow-category-3/5 hover:-translate-y-[2px] hover:ring-1 hover:ring-category-3/10 relative border rounded-2xl bg-card/70 backdrop-blur-md shadow-sm shadow-category-3/5",
        getBorderClass(),
        hasAINote && "ring-2 ring-category-3/50 ring-offset-2",
        isExcellent && "bg-gradient-to-br from-status-success-subtle/50 to-category-3/5"
      )}
      onClick={onClick}
    >
      {/* AI Badge (if applicable) */}
      {hasAINote && (
        <div className="absolute top-3 end-3 z-10">
          <Badge variant="secondary" className="gap-1 bg-category-3/90 text-primary-foreground backdrop-blur-sm animate-pulse">
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
            <h4 className="text-base font-semibold text-category-3">{data.day}</h4>
            <p className="text-xs text-muted-foreground">{fmtDate(new Date(data.date), { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <Moon 
            className={cn(
              "w-8 h-8 transition-all duration-1200 ease-in-out",
              isExcellent ? "text-category-3 animate-pulse" : isGood ? "text-category-2" : "text-muted-foreground"
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
              background: 'hsl(var(--muted) / 0.5)'
            }}
          />
          <p className="text-xs text-muted-foreground italic mt-1.5">
            {getStatusText()}
          </p>
        </div>
        
        {/* Bedtime */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{t('screens.health.bedtimeBedtimeWakeWaketime', { bedtime: data.bedtime, wakeTime: data.wakeTime })}</span>
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
              <Brain className="w-3.5 h-3.5 text-category-3 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground italic">
                {data.aiNote}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Excellence Badge Overlay */}
      {isExcellent && (
        <div className="absolute top-3 start-3">
          <Badge className="bg-gradient-to-r from-status-success/80 to-category-1/80 text-primary-foreground text-xs font-semibold px-2 py-1 rounded-full gap-1 border-0">
            <Sparkles className="w-3 h-3" />
            {t('screens.health.excellent')}
          </Badge>
        </div>
      )}
    </Card>
  );
}
