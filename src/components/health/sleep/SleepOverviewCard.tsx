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
    <Card className="p-6 mb-6 bg-gradient-to-br from-[#B8C7FF]/40 via-[#CFC8F7]/30 to-[#EAF2FF]/25
      dark:from-[#0C1024]/90 dark:via-[#1B1E36]/85 dark:to-[#202842]/80 
      backdrop-blur-sm border-slate-200/60 dark:border-slate-800/50 shadow-sm shadow-indigo-100/30 dark:shadow-indigo-900/20">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pt-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <h2 className="text-xl font-bold">{t('screens.health.yourSleepPlanPoweredByAutopilot')}</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/50 shadow-sm shadow-indigo-100/30 dark:shadow-indigo-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('screens.health.goalFocus')}</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/50 shadow-sm shadow-indigo-100/30 dark:shadow-indigo-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.schedule')}</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Consistent bedtime {planData.targetBedtime}
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/50 shadow-sm shadow-indigo-100/30 dark:shadow-indigo-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.progress')}</span>
          </div>
          <p className="text-lg font-bold">
            Week {planData.currentWeek} of {planData.totalWeeks}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {planData.completionPercentage}% complete
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('screens.health.trackingYourAverageSleepQualityOver')}
          </span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
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
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
        dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/30 dark:border-indigo-700/30 mb-8">
        <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">{t('screens.health.aiInsight')}</p>
            <span className="text-xs text-slate-500/90 dark:text-slate-400/80 whitespace-nowrap">
              Last updated {planData.lastUpdated}
            </span>
          </div>
          <p className="text-sm italic text-slate-600/90 dark:text-slate-300/80">
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
        <Sparkles className="w-4 h-4 mr-2" />
        {t('screens.health.recalibratePlan')}
      </Button>
      
      {/* Helper Text */}
      <p className="text-xs text-center text-slate-500/90 dark:text-slate-400/80 mt-2">
        {t('screens.health.recalibrationAdjustsYourSleepGoalsBased')}
      </p>
    </Card>
  );
}
