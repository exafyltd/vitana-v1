import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, Droplets, Sparkles } from "lucide-react";
import { HydrationPlanData } from "@/types/hydration";
import { t } from '@/lib/i18n-toast';

interface HydrationOverviewCardProps {
  planData: HydrationPlanData;
  onRecalibrate?: () => void;
}

export function HydrationOverviewCard({ planData, onRecalibrate }: HydrationOverviewCardProps) {
  return (
    <Card className="relative p-6 pt-10 mb-6 overflow-hidden bg-gradient-to-br from-surface-page-from to-surface-page-via
      border-border/60 rounded-2xl
      before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.05)_0%,transparent_60%)]
      before:pointer-events-none">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-category-1" />
            <h2 className="text-xl font-bold">{t('screens.health.yourHydrationPlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('screens.health.smartHydrationGuidanceTailoredYourLifestyle')}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          {t('screens.health.aiOptimized')}
        </Badge>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Goal Focus */}
        <div className="p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-category-1 transition-all duration-900" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-category-7 transition-all duration-900" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.schedule')}</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-muted-foreground">{t('screens.health.value0LDailyTarget', { value0: (planData.dailyTargetMl / 1000).toFixed(1) })}
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-category-3 transition-all duration-900" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.progress')}</span>
          </div>
          <p className="text-lg font-bold">{t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks })}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage })}
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground tracking-tight">
            {t('screens.health.trackingYourWeeklyConsistency')}
          </span>
          <span className="text-sm font-bold text-category-1">
            {planData.completionPercentage}%
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
          <div 
            className="h-full bg-gradient-to-r from-category-7/80 to-category-1 transition-all ease-in-out duration-1200 rounded-full relative overflow-hidden
              before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-card/40 before:to-transparent
              before:animate-[shimmer_2s_ease-in-out_infinite] before:translate-x-[-100%]"
            style={{ width: `${planData.completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-category-1/10 to-category-3/10 
 border border-border60 mb-4">
        <Brain className="w-5 h-5 text-category-1 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">{t('screens.health.aiInsight')}</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t('screens.health.lastUpdatedLastupdated', { lastUpdated: planData.lastUpdated })}</span>
          </div>
          <p className="text-sm font-medium italic text-muted-foreground/90">
            "{planData.aiInsight}"
          </p>
        </div>
      </div>
      
      {/* Recalibrate Button */}
      <Button 
        variant="outline" 
        className="w-full"
        onClick={onRecalibrate}
      >
        <Sparkles className="w-4 h-4 me-2" />
        {t('screens.health.recalibratePlan')}
      </Button>
      
      {/* Helper Text */}
      <p className="text-xs text-center text-muted-foreground mt-2">
        {t('screens.health.recalibrationAdjustsHydrationGoalsBasedTemperature')}
      </p>
    </Card>
  );
}
