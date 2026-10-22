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
      'water': 'text-blue-600',
      'electrolyte': 'text-cyan-600',
      'herbal-tea': 'text-green-600',
      'coconut-water': 'text-amber-600',
      'sports-drink': 'text-purple-600'
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
          backdrop-blur-xl bg-card/90"
      >
        {/* Header with Glass Visualization */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-page-from to-surface-page-via p-8
          before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.06)_0%,transparent_60%)]
          before:pointer-events-none">
          
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
          
          {/* Glass Animation */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-48 mb-4">
              {/* Glass Container */}
              <div className="absolute inset-0 border-4 border-category-1/40 rounded-b-3xl 
                bg-gradient-to-b from-transparent via-category-1/5 to-category-1/10" />
              
              {/* Water Fill Level */}
              <div 
                className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-category-1/80 to-category-1/40 
                  rounded-b-3xl transition-all duration-700"
                style={{ height: `${data.completionPercentage}%` }}
              >
                {/* Animated Ripple Effect */}
                <div className="absolute top-0 start-0 end-0 h-2 bg-category-1/25 opacity-50 animate-pulse" />
              </div>
              
              {/* Percentage Label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-category-1 drop-shadow-lg">
                  {data.completionPercentage}%
                </span>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground mb-1">{t('screens.health.dayHydration', { day: data.day })}
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
            <div className="p-3 rounded-xl bg-gradient-to-br from-category-1/10 to-category-7/10 
 text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1 text-category-1" />
              <p className="text-xs text-muted-foreground">{t('screens.health.current')}</p>
              <p className="text-sm font-bold">{(data.currentAmount / 1000).toFixed(1)}L</p>
            </div>
            
            <div className="p-3 rounded-xl bg-gradient-to-br from-category-3/10 to-category-3/10 
 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-category-3" />
              <p className="text-xs text-muted-foreground">{t('screens.health.target')}</p>
              <p className="text-sm font-bold">{(data.targetAmount / 1000).toFixed(1)}L</p>
            </div>
            
            <div className="p-3 rounded-xl bg-gradient-to-br from-category-7/10 to-category-1/10 
 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-category-7" />
              <p className="text-xs text-muted-foreground">{t('screens.health.remaining')}</p>
              <p className="text-sm font-bold">
                {remaining > 0 ? `${(remaining / 1000).toFixed(1)}L` : 'Goal Met!'}
              </p>
            </div>
          </div>
          
          {/* AI Suggestion */}
          {isComplete ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-status-success/10 to-status-success/10 
 border border-border30">
              <CheckCircle2 className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">{t('screens.health.goalAchieved')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('screens.health.youRePerfectlyHydratedTodayGreat')}
                </p>
              </div>
            </div>
          ) : (
            data.aiNote && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-category-1/10 to-category-3/10 
 border border-border30">
                <Brain className="w-5 h-5 text-category-1 flex-shrink-0 mt-0.5" />
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
            <span className="text-sm font-bold text-category-1">
              {data.nextReminder}
            </span>
          </div>
          
          <Separator />
          
          {/* Hydration Timeline */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-category-1" />
              {t('screens.health.hydrationTimeline')}
            </h3>
            <div className="space-y-3">
              {data.intakes.map((intake, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Time */}
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-category-1/15 to-category-3/15">
                    <span className="text-xs font-bold text-category-1">
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
                        <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
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
              className="flex-1 gap-2 bg-gradient-to-r from-category-1 to-category-3 
                hover:from-category-1 hover:to-category-3"
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
