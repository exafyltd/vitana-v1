import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, Moon, Sparkles } from "lucide-react";
import { SleepPlanData } from "@/types/sleep";
import { t } from '@/lib/i18n-toast';

interface SleepOverviewCardProps {
  planData: SleepPlanData;
  onRecalibrate?: () => void;
}

export function SleepOverviewCard({ planData, onRecalibrate }: SleepOverviewCardProps) {
  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to
      backdrop-blur-sm border-border/60 shadow-sm">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pt-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-category-3 animate-pulse" />
            <h2 className="text-xl font-bold">{t('screens.health.yourSleepPlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('screens.health.smartSleepGuidanceTunedYourCircadian')}
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
        <div className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-category-3" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-category-2" />
            <span className="text-sm font-medium text-muted-foreground">{t('screens.health.schedule')}</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-muted-foreground">{t('screens.health.consistentBedtimeTargetbedtime', { targetBedtime: planData.targetBedtime })}</p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-category-7" />
            <span className="text-sm font-medium text-muted-foreground">{t('screens.health.progress')}</span>
          </div>
          <p className="text-lg font-bold">{t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks })}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage })}
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('screens.health.trackingYourAverageSleepQualityOver')}
          </span>
          <span className="text-sm font-bold text-category-3">
            {planData.completionPercentage}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage} 
          className="h-3 transition-all ease-in-out duration-1200"
          style={{
            background: 'hsl(var(--muted) / 0.3)'
          }}
        />
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-category-3/10 to-category-2/10 
 border border-border30 mb-8">
        <Brain className="w-5 h-5 text-category-3 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">{t('screens.health.aiInsight')}</p>
            <span className="text-xs text-muted-foreground/90 whitespace-nowrap">{t('screens.health.lastUpdatedLastupdated', { lastUpdated: planData.lastUpdated })}</span>
          </div>
          <p className="text-sm italic text-muted-foreground/90">
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
      <p className="text-xs text-center text-muted-foreground/90 mt-2">
        {t('screens.health.recalibrationAdjustsYourSleepGoalsBased')}
      </p>
    </Card>
  );
}
