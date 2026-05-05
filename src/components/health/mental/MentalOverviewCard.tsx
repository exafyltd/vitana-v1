import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Leaf, Clock, TrendingUp, Settings } from "lucide-react";
import { MentalPlanData } from "@/types/mental";
import { Progress } from "@/components/ui/progress";
import { t } from '@/lib/i18n-toast';

interface MentalOverviewCardProps {
  planData: MentalPlanData;
  onRecalibrate?: () => void;
}

export function MentalOverviewCard({ planData, onRecalibrate }: MentalOverviewCardProps) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-[#FDE2E4]/60 via-[#FAD4C0]/60 to-[#CDEDF6]/60 dark:from-[#1A1013]/90 dark:via-[#1E1C1B]/90 dark:to-[#122025]/90 border border-slate-200/60 dark:border-slate-800/60">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {t('screens.health.yourMentalPlanPoweredByAutopilot')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('screens.health.aiguidedInsightsHelpYouManageStress')}
            </p>
          </div>
          <Badge variant="secondary" className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60">
            <Brain className="w-3 h-3 mr-1 animate-pulse" />
            {t('screens.health.aiOptimized')}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.goalFocus')}</span>
            </div>
            <p className="text-base font-semibold">{planData.goal}</p>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.schedule')}</span>
            </div>
            <p className="text-base font-semibold">{planData.schedule}</p>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('screens.health.programProgress')}</span>
            </div>
            <p className="text-base font-semibold">{planData.progressText} · {planData.completion}% complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('screens.health.trackingYourAverageMentalBalanceFocus')}
          </p>
          <Progress 
            value={planData.completion} 
            className="h-2 bg-slate-200/50 dark:bg-slate-800/50"
          />
        </div>

        {/* AI Insight */}
        <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl backdrop-blur-md p-4 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium italic text-slate-600/90 dark:text-slate-300/80">
                {planData.aiInsight}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Last updated {planData.lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Recalibrate Button */}
        <div className="pt-2 space-y-3">
          <Button 
            variant="outline" 
            className="w-full bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60"
            onClick={onRecalibrate}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('screens.health.recalibratePlan')}
          </Button>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            {t('screens.health.recalibrationAdjustsYourMentalGoalsBased')}
          </p>
        </div>
      </div>
    </Card>
  );
}
