import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, TrendingUp, Sparkles } from "lucide-react";
import { NutritionPlanData } from "@/types/recipe";
import { t } from '@/lib/i18n-toast';

interface NutritionOverviewCardProps {
  planData: NutritionPlanData;
  onRecalibrate?: () => void;
}

export function NutritionOverviewCard({ planData, onRecalibrate }: NutritionOverviewCardProps) {
  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-status-success-subtle/50 via-category-1/5 to-category-2/5 
 
      backdrop-blur-sm border-border50">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-status-success" />
            <h2 className="text-xl font-bold">{t('screens.health.yourNutritionPlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('screens.health.aioptimizedMealGuidanceTailoredYourPreferences')}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          {t('screens.health.aiOptimized')}
        </Badge>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Goal Focus */}
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-status-success" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus || 'Balanced Nutrition'}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-category-1" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.schedule')}</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule || '3 meals + 2 snacks'}
          </p>
          <p className="text-xs text-muted-foreground">
            {planData.caloriesTarget ? `${planData.caloriesTarget} cal target` : 'Daily'}
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-category-2" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.progress')}</span>
          </div>
          <p className="text-lg font-bold">{t('screens.health.weekValue0Value1', { value0: planData.currentWeek || 1, value1: planData.totalWeeks || 4 })}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.value0Complete2', { value0: planData.completionPercentage || 0 })}
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            {t('screens.health.trackingYourWeeklyConsistency')}
          </span>
          <span className="text-sm font-bold text-status-success">
            {planData.completionPercentage || 0}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage || 0} 
          className="h-3 bg-gradient-to-r from-card/50 to-card/30"
        />
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-status-success/10 to-category-1/10 
 border border-border30 mb-4">
        <Brain className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">{t('screens.health.aiInsight')}</p>
            {planData.lastUpdated && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{t('screens.health.lastUpdatedLastupdated', { lastUpdated: planData.lastUpdated })}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground italic">
            "{planData.aiInsight || 'Your nutrition plan is optimized for your current activity level and goals.'}"
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
    </Card>
  );
}
