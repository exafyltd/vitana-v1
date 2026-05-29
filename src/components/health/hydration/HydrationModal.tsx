import { DailyHydrationData } from "@/types/hydration";
import {
  Sheet,
  SheetContent,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Droplets, 
  Clock, 
  Brain, 
  Plus,
  CheckCircle2,
  ArrowLeft,
  X,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

import { fmtDate } from '@/lib/locale-format';
interface HydrationModalProps {
  data: DailyHydrationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HydrationModal({ data, open, onOpenChange }: HydrationModalProps) {
  if (!data) return null;
  
  const isComplete = data.completionPercentage >= 100;
  const remaining = data.targetAmount - data.currentAmount;
  
  const getTypeColor = (type: string) => {
    const colors = {
      'water': 'text-blue-600 dark:text-blue-400',
      'electrolyte': 'text-cyan-600 dark:text-cyan-400',
      'herbal-tea': 'text-green-600 dark:text-green-400',
      'coconut-water': 'text-amber-600 dark:text-amber-400',
      'sports-drink': 'text-purple-600 dark:text-purple-400'
    };
    return colors[type as keyof typeof colors] || 'text-slate-600';
  };
  
  const getTypeBadge = (type: string) => {
    const badges = {
      'water': 'Water',
      'electrolyte': 'Electrolyte',
      'herbal-tea': 'Herbal Tea',
      'coconut-water': 'Coconut Water',
      'sports-drink': 'Sports Drink'
    };
    return badges[type as keyof typeof badges] || type;
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-2xl overflow-y-auto p-0 
          backdrop-blur-xl bg-white/90 dark:bg-slate-900/90"
      >
        {/* Header with Glass Visualization */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f9fdff] to-[#f1faff]
          dark:from-slate-900 dark:to-slate-800 p-8
          before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.06)_0%,transparent_60%)]
          before:pointer-events-none">
          
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
          
          {/* Glass Animation */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-48 mb-4">
              {/* Glass Container */}
              <div className="absolute inset-0 border-4 border-cyan-300 dark:border-cyan-700 rounded-b-3xl 
                bg-gradient-to-b from-transparent via-cyan-100/20 to-cyan-100/40 dark:via-cyan-900/20 dark:to-cyan-900/40" />
              
              {/* Water Fill Level */}
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-cyan-300 
                  dark:from-cyan-600 dark:to-cyan-500 rounded-b-3xl transition-all duration-700"
                style={{ height: `${data.completionPercentage}%` }}
              >
                {/* Animated Ripple Effect */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-200 dark:bg-cyan-400 opacity-50 animate-pulse" />
              </div>
              
              {/* Percentage Label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-cyan-700 dark:text-cyan-300 drop-shadow-lg">
                  {data.completionPercentage}%
                </span>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{t('screens.health.dayHydration', { day: data.day })}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {fmtDate(new Date(data.date), { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 
              dark:from-cyan-950/30 dark:to-sky-950/30 text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1 text-cyan-600 dark:text-cyan-400" />
              <p className="text-xs text-muted-foreground">{t('screens.health.current')}</p>
              <p className="text-sm font-bold">{(data.currentAmount / 1000).toFixed(1)}L</p>
            </div>
            
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 
              dark:from-blue-950/30 dark:to-indigo-950/30 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-muted-foreground">{t('screens.health.target')}</p>
              <p className="text-sm font-bold">{(data.targetAmount / 1000).toFixed(1)}L</p>
            </div>
            
            <div className="p-3 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 
              dark:from-sky-950/30 dark:to-cyan-950/30 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-sky-600 dark:text-sky-400" />
              <p className="text-xs text-muted-foreground">{t('screens.health.remaining')}</p>
              <p className="text-sm font-bold">
                {remaining > 0 ? `${(remaining / 1000).toFixed(1)}L` : 'Goal Met!'}
              </p>
            </div>
          </div>
          
          {/* AI Suggestion */}
          {isComplete ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 
              dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200/30 dark:border-green-700/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">{t('screens.health.goalAchieved')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('screens.health.youRePerfectlyHydratedTodayGreat')}
                </p>
              </div>
            </div>
          ) : (
            data.aiNote && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
                dark:from-cyan-500/20 dark:to-blue-500/20 border border-cyan-200/30 dark:border-cyan-700/30">
                <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">{t('screens.health.aiInsight')}</p>
                  <p className="text-sm text-muted-foreground italic">
                    {data.aiNote}
                  </p>
                </div>
              </div>
            )
          )}
          
          {/* Next Reminder */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('screens.health.nextReminder')}</span>
            </div>
            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {data.nextReminder}
            </span>
          </div>
          
          <Separator />
          
          {/* Hydration Timeline */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-600" />
              {t('screens.health.hydrationTimeline')}
            </h3>
            <div className="space-y-3">
              {data.intakes.map((intake, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Time */}
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30">
                    <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">
                      {intake.time}
                    </span>
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {getTypeBadge(intake.type)}
                      </Badge>
                      {intake.logged && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm font-semibold">{t('screens.health.amountMl', { amount: intake.amount })}</p>
                  </div>
                  
                  {/* Icon */}
                  <Droplets className={cn("w-6 h-6", getTypeColor(intake.type))} />
                </div>
              ))}
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
              onClick={() => notifyInfo('toasts.health.reminderSettingsOpened')}
            >
              <Clock className="w-4 h-4" />
              {t('screens.health.setReminder')}
            </Button>
            
            <Button 
              className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 
                hover:from-cyan-600 hover:to-blue-600"
              onClick={() => notifySuccess('toasts.health.waterIntakeLogged')}
            >
              <Plus className="w-4 h-4" />
              {t('screens.health.logWater')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
