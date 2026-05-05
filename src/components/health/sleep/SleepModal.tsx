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

interface SleepModalProps {
  data: DailySleepData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SleepModal({ data, open, onOpenChange }: SleepModalProps) {
  if (!data) return null;
  
  const isExcellent = data.sleepScore >= 85;
  
  const getQualityColor = () => {
    if (data.sleepScore >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (data.sleepScore >= 70) return 'text-sky-600 dark:text-sky-400';
    return 'text-amber-600 dark:text-amber-400';
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto p-0 
          backdrop-blur-xl bg-white/90 dark:bg-slate-900/90"
      >
        {/* Header with Sleep Visualization */}
        <div className="relative bg-gradient-to-br from-indigo-100 via-purple-50 to-sky-100 
          dark:from-indigo-950 dark:via-purple-950 dark:to-sky-950 p-8">
          
          {/* Close Buttons */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full 
              bg-white/30 backdrop-blur-md hover:bg-white/40 
              flex items-center justify-center transition-all z-10"
          >
            <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
          
          <button
            onClick={() => onOpenChange(false)}
            className="md:hidden absolute top-4 left-4 w-10 h-10 rounded-full 
              bg-white/30 backdrop-blur-md hover:bg-white/40 
              flex items-center justify-center transition-all z-10"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
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
                  className="text-slate-200 dark:text-slate-700" 
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
                <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                  {data.sleepScore}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">Score</span>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
              {data.day} - Sleep
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 
              dark:from-indigo-950/30 dark:to-purple-950/30 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs text-slate-600 dark:text-slate-400">Duration</p>
              <p className="text-sm font-bold">{data.duration}</p>
            </div>
            
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-sky-50 
              dark:from-purple-950/30 dark:to-sky-950/30 text-center">
              <Bed className="w-5 h-5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
              <p className="text-xs text-slate-600 dark:text-slate-400">Bedtime</p>
              <p className="text-sm font-bold">{data.bedtime}</p>
            </div>
            
            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 
              dark:from-sky-950/30 dark:to-indigo-950/30 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-sky-600 dark:text-sky-400" />
              <p className="text-xs text-slate-600 dark:text-slate-400">Wake</p>
              <p className="text-sm font-bold">{data.wakeTime}</p>
            </div>
          </div>
          
          {/* AI Suggestion */}
          {isExcellent ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 
              dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-200/30 dark:border-emerald-700/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">{t('screens.health.excellentSleep')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your sleep quality was outstanding. Keep maintaining this routine!
                </p>
              </div>
            </div>
          ) : (
            data.aiNote && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
                dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/30 dark:border-indigo-700/30">
                <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">{t('screens.health.aiInsight')}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
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
              <Moon className="w-5 h-5 text-indigo-600" />
              Sleep Stages
            </h3>
            <div className="space-y-3">
              {data.stages.map((stage, idx) => {
                const stageColors = {
                  deep: 'from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 text-indigo-700 dark:text-indigo-300',
                  light: 'from-sky-100 to-sky-200 dark:from-sky-900/30 dark:to-sky-800/30 text-sky-700 dark:text-sky-300',
                  rem: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-300',
                  awake: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-700 dark:text-amber-300'
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
                        <p className="text-sm font-semibold capitalize">{stage.stage} Sleep</p>
                        <Badge variant="outline" className="text-xs">
                          {stage.percentage}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
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
              <h4 className="text-sm font-semibold mb-2">Tags</h4>
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
              View Trends
            </Button>
            
            <Button 
              className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 
                hover:from-indigo-600 hover:to-purple-600"
              onClick={() => notifySuccess('toasts.health.sleepDataLogged')}
            >
              <Sparkles className="w-4 h-4" />
              Log Sleep
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
