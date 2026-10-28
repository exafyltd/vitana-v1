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
    <Card className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to border border-border/60 shadow-sm">
      <h3 className="text-xl font-semibold tracking-tight mb-4">{t('screens.health.weeklyMindAnalytics')}</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Smile className="w-4 h-4 text-category-4" />
            <span className="text-sm text-muted-foreground">{t('screens.health.avgMoodIndex')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.avgMoodIndex}</p>
        </div>

        <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-category-1" />
            <span className="text-sm text-muted-foreground">{t('screens.health.focusStability')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.focusStability}</p>
          <p className="text-xs text-status-success mt-1">
            {progress.focusStabilityTrend}
          </p>
        </div>

        <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-status-warning" />
            <span className="text-sm text-muted-foreground">{t('screens.health.stressRecovery')}</span>
          </div>
          <p className="text-2xl font-bold">{progress.stressRecovery}</p>
        </div>

        <div className="bg-card/70 backdrop-blur-md rounded-xl p-4 border border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-status-warning" />
            <span className="text-sm text-muted-foreground">{t('screens.health.mindfulnessStreak')}</span>
          </div>
          <p className="text-2xl font-bold">{t('screens.health.mindfulnessstreakDays', { mindfulnessStreak: progress.mindfulnessStreak })}</p>
        </div>
      </div>

      {aiSummary && (
        <div className="bg-card/60 rounded-xl backdrop-blur-md p-4 border border-border/60">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-category-4 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{t('screens.health.aiSummary')}</p>
              <p className="text-sm italic text-muted-foreground">{aiSummary}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
