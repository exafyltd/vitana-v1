import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProgress } from "@/types/sleep";
import { 
  TrendingUp, 
  Moon, 
  Flame,
  CheckCircle2,
  Brain,
  Activity
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SleepDashboardProps {
  progress: SleepProgress;
  aiSummary?: string;
}

export function SleepDashboard({ progress, aiSummary }: SleepDashboardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to
      backdrop-blur-sm border-border/60 shadow-sm">
      
      <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-category-3" />
        {t('screens.health.weeklySleepAnalytics')}
      </h3>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Average Duration */}
        <div className="text-center p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <Moon className="w-6 h-6 mx-auto mb-2 text-category-3" />
          <p className="text-2xl font-bold">{progress.avgDuration}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.avgDuration')}</p>
        </div>
        
        {/* Consistency Score */}
        <div className="text-center p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <div className="relative w-16 h-16 mx-auto mb-2">
            {/* Circular Progress */}
            <svg className="w-full h-full -rotate-90">
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                fill="none" 
                stroke="currentColor" 
                className="text-muted-foreground" 
                strokeWidth="5" 
              />
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                fill="none" 
                stroke="currentColor"
                className="text-category-2 transition-all duration-1000"
                strokeWidth="5" 
                strokeDasharray={`${progress.consistencyScore * 1.76} ${176 - progress.consistencyScore * 1.76}`}
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-category-2">
                {progress.consistencyScore}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('screens.health.consistency')}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            <TrendingUp className="w-3 h-3 me-1" />
            +{progress.consistencyTrend}%
          </Badge>
        </div>
        
        {/* Deep Sleep */}
        <div className="text-center p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <Activity className="w-6 h-6 mx-auto mb-2 text-category-7" />
          <p className="text-2xl font-bold">{progress.deepSleepPercentage}%</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.deepSleep')}</p>
        </div>
        
        {/* Streak Days */}
        <div className="text-center p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-border/60 shadow-sm shadow-category-3/5">
          <Flame className="w-6 h-6 mx-auto mb-2 text-status-warning" />
          <p className="text-2xl font-bold">{progress.streakDays}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.dayStreak')}</p>
        </div>
      </div>
      
      {/* Recovery Impact */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-status-success-subtle to-status-success-subtle 
 border border-border30 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-status-success" />
            <span className="text-sm font-medium">{t('screens.health.recoveryImpact')}</span>
          </div>
          <Badge className="bg-status-success hover:bg-status-success">
            {progress.recoveryImpact}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t('screens.health.qualitySleepImprovingYourEnergyPerformance')}
        </p>
      </div>
      
      {/* AI Summary */}
      {aiSummary && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-category-3/10 to-category-2/10 
 border border-border30">
          <Brain className="w-5 h-5 text-category-3 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="text-sm italic text-muted-foreground/90">
            "{aiSummary}"
          </p>
        </div>
      )}
    </Card>
  );
}
