import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, TrendingUp, Sparkles } from "lucide-react";
import { ExercisePlanData } from "@/types/exercise";
import { t } from '@/lib/i18n-toast';

interface ExerciseOverviewCardProps {
  planData: ExercisePlanData;
  onRecalibrate?: () => void;
}

export function ExerciseOverviewCard({ planData, onRecalibrate }: ExerciseOverviewCardProps) {
  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-category-3/5 via-category-1/5 to-category-2/5 
 
      backdrop-blur-sm border-border50">
      
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-category-3" />
            <h2 className="text-xl font-bold">{t('screens.health.yourExercisePlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('screens.health.aioptimizedWorkoutsTailoredYourFitnessLevel')}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          {t('screens.health.aiOptimized')}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-category-3" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-category-1" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.schedule')}</span>
          </div>
          <p className="text-lg font-bold">{t('screens.health.sessionsperweekSessionsWeek', { sessionsPerWeek: planData.sessionsPerWeek })}
          </p>
          <p className="text-xs text-muted-foreground">{t('screens.health.avgDurationAvgdurationMin', { avgDuration: planData.avgDuration })}
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-category-2" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.progress')}</span>
          </div>
          <p className="text-lg font-bold">{t('screens.health.weekCurrentweekTotalweeks', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks })}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.completionpercentageComplete', { completionPercentage: planData.completionPercentage })}
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t('screens.health.weekCurrentweekTotalweeksweekProgram', { currentWeek: planData.currentWeek, totalWeeks: planData.totalWeeks })}</span>
          <span className="text-sm font-bold text-category-3">
            {planData.completionPercentage}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage} 
          className="h-3 bg-gradient-to-r from-card/50 to-card/30"
        />
      </div>
      
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-category-3/10 to-category-1/10 
 border border-border30 mb-4">
        <Brain className="w-5 h-5 text-category-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium mb-1">{t('screens.health.aiInsight')}</p>
          <p className="text-sm text-muted-foreground italic">
            "{planData.aiInsight}"
          </p>
        </div>
      </div>
      
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
