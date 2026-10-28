import { DailySleepData } from "@/types/sleep";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Moon, 
  Clock, 
  Brain, 
  CheckCircle2,
  ArrowLeft,
  X,
  Sparkles,
  TrendingUp,
  Bed
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface SleepModalProps {
  data: DailySleepData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SleepModal({ data, open, onOpenChange }: SleepModalProps) {
  if (!data) return null;
  
  const isExcellent = data.sleepScore >= 85;
  
  const getQualityColor = () => {
    if (data.sleepScore >= 85) return 'text-emerald-600';
    if (data.sleepScore >= 70) return 'text-sky-600';
    return 'text-amber-600';
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto p-0 
          backdrop-blur-xl bg-card/90"
      >
        {/* Header with Sleep Visualization */}
        <div className="relative bg-gradient-to-br from-category-3/15 via-category-2/10 to-category-7/15 p-8">
          
          {/* Close Buttons */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 end-4 w-10 h-10 rounded-full 
              bg-card/30 backdrop-blur-md hover:bg-card/40 
              flex items-center justify-center transition-all z-10"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <button
            onClick={() => onOpenChange(false)}
            className="md:hidden absolute top-4 start-4 w-10 h-10 rounded-full 
              bg-card/30 backdrop-blur-md hover:bg-card/40 
              flex items-center justify-center transition-all z-10"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          
          {/* Sleep Score Circle */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              {/* Circular Progress */}
              <svg className="w-full h-full -rotate-90">
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  fill="none" 
                  stroke="currentColor" 
                  className="text-muted-foreground" 
                  strokeWidth="8" 
                />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="56" 
                  fill="none" 
                  stroke="currentColor"
                  className={cn("transition-all duration-1000", getQualityColor())}
                  strokeWidth="8" 
                  strokeDasharray={`${data.sleepScore * 3.52} ${352 - data.sleepScore * 3.52}`}
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-category-3">
                  {data.sleepScore}
                </span>
                <span className="text-xs text-muted-foreground">{t('screens.health.score')}</span>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-1">{t('screens.health.daySleep', { day: data.day })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {fmtDate(new Date(data.date), { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-category-3/10 to-category-2/10 
 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-category-3" />
              <p className="text-xs text-muted-foreground">{t('screens.health.duration')}</p>
              <p className="text-sm font-bold">{data.duration}</p>
            </div>
            
            <div className="p-3 rounded-2xl bg-gradient-to-br from-category-2/10 to-category-7/10 
 text-center">
              <Bed className="w-5 h-5 mx-auto mb-1 text-category-2" />
              <p className="text-xs text-muted-foreground">{t('screens.health.bedtime')}</p>
              <p className="text-sm font-bold">{data.bedtime}</p>
            </div>
            
            <div className="p-3 rounded-2xl bg-gradient-to-br from-category-7/10 to-category-3/10 
 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-category-7" />
              <p className="text-xs text-muted-foreground">{t('screens.health.wake')}</p>
              <p className="text-sm font-bold">{data.wakeTime}</p>
            </div>
          </div>
          
          {/* AI Suggestion */}
          {isExcellent ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-status-success/10 to-status-success/10 
 border border-border30">
              <CheckCircle2 className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">{t('screens.health.excellentSleep')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('screens.health.yourSleepQualityOutstandingKeepMaintaining')}
                </p>
              </div>
            </div>
          ) : (
            data.aiNote && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-category-3/10 to-category-2/10 
 border border-border30">
                <Brain className="w-5 h-5 text-category-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">{t('screens.health.aiInsight')}</p>
                  <p className="text-sm text-muted-foreground italic">
                    {data.aiNote}
                  </p>
                </div>
              </div>
            )
          )}
          
          <Separator />
          
          {/* Sleep Stages */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Moon className="w-5 h-5 text-category-3" />
              {t('screens.health.sleepStages')}
            </h3>
            <div className="space-y-3">
              {data.stages.map((stage, idx) => {
                const stageColors = {
                  deep: 'from-indigo-100 to-indigo-200 text-indigo-700',
                  light: 'from-sky-100 to-sky-200 text-sky-700',
                  rem: 'from-purple-100 to-purple-200 text-purple-700',
                  awake: 'from-amber-100 to-amber-200 text-amber-700'
                };
                
                return (
                  <div 
                    key={idx} 
                    className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {/* Stage Circle */}
                    <div className={cn(
                      "flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br",
                      stageColors[stage.stage]
                    )}>
                      <span className="text-xs font-bold capitalize">
                        {stage.stage}
                      </span>
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold capitalize">{t('screens.health.stageSleep', { stage: stage.stage })}</p>
                        <Badge variant="outline" className="text-xs">
                          {stage.percentage}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(stage.duration / 60)}h {stage.duration % 60}m
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Tags */}
          {data.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">{t('screens.health.tags')}</h4>
              <div className="flex flex-wrap gap-2">
                {data.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="capitalize">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <SheetFooter className="p-6 border-t sticky bottom-0 bg-background/95 backdrop-blur-md">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => notifyInfo('toasts.health.sleepInsightsOpened')}
            >
              <TrendingUp className="w-4 h-4" />
              {t('screens.health.viewTrends')}
            </Button>
            
            <Button 
              className="flex-1 gap-2 bg-gradient-to-r from-category-3 to-category-2 
                hover:from-category-3 hover:to-category-2"
              onClick={() => notifySuccess('toasts.health.sleepDataLogged')}
            >
              <Sparkles className="w-4 h-4" />
              {t('screens.health.logSleep')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
