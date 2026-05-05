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
    <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-violet-50/50 
      dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 
      backdrop-blur-sm border-blue-200/50 dark:border-slate-700/50">
      
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold">{t('screens.health.yourExercisePlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-optimized workouts tailored to your fitness level and recovery
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          AI Optimized
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-medium text-muted-foreground">Schedule</span>
          </div>
          <p className="text-lg font-bold">
            {planData.sessionsPerWeek} sessions / week
          </p>
          <p className="text-xs text-muted-foreground">
            Avg duration {planData.avgDuration} min
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
          </div>
          <p className="text-lg font-bold">
            Week {planData.currentWeek} of {planData.totalWeeks}
          </p>
          <p className="text-xs text-muted-foreground">
            {planData.completionPercentage}% complete
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Week {planData.currentWeek} of {planData.totalWeeks}-Week Program</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {planData.completionPercentage}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage} 
          className="h-3 bg-gradient-to-r from-white/50 to-white/30 dark:from-slate-800/50 dark:to-slate-700/50"
        />
      </div>
      
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 
        dark:from-blue-500/20 dark:to-cyan-500/20 border border-blue-200/30 dark:border-blue-700/30 mb-4">
        <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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
        <Sparkles className="w-4 h-4 mr-2" />
        Recalibrate Plan
      </Button>
    </Card>
  );
}
