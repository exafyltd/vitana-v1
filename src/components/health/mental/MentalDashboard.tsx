import { Card } from "@/components/ui/card";
import { Brain, Smile, Target, TrendingUp, Zap } from "lucide-react";
import { MentalProgress } from "@/types/mental";
import { t } from '@/lib/i18n-toast';

interface MentalDashboardProps {
  progress: MentalProgress;
  aiSummary?: string;
}

export function MentalDashboard({ progress, aiSummary }: MentalDashboardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-[#FDE2E4]/40 via-[#FAD4C0]/30 to-[#CDEDF6]/25 dark:from-[#1A1013]/90 dark:via-[#1E1C1B]/85 dark:to-[#122025]/80 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
      <h3 className="text-xl font-semibold tracking-tight mb-4">{t('screens.health.weeklyMindAnalytics')}</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Smile className="w-4 h-4 text-rose-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('screens.health.avgMoodIndex')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.avgMoodIndex}</p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-teal-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('screens.health.focusStability')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.focusStability}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {progress.focusStabilityTrend}
          </p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('screens.health.stressRecovery')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.stressRecovery}</p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('screens.health.mindfulnessStreak')}</span>
          </div>
          <p className="text-2xl font-bold">{t('screens.health.mindfulnessstreakDays', { mindfulnessStreak: progress.mindfulnessStreak })}</p>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-white/60 dark:bg-slate-900/50 rounded-xl backdrop-blur-md p-4 border border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('screens.health.aiSummary')}</p>
              <p className="text-sm italic text-slate-700 dark:text-slate-300">{aiSummary}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
