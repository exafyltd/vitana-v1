import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HydrationProgress } from "@/types/hydration";
import { 
  TrendingUp, 
  Droplets, 
  CalendarX, 
  Flame,
  CheckCircle2,
  Brain 
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface HydrationDashboardProps {
  progress: HydrationProgress;
  aiSummary?: string;
}

export function HydrationDashboard({ progress, aiSummary }: HydrationDashboardProps) {
  return (
    <Card className="relative p-6 overflow-hidden bg-gradient-to-br from-surface-page-from to-surface-page-via
      rounded-2xl border-border/60
      before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_50%_50%,rgba(100,100,100,0.05)_0%,transparent_60%)]
      before:pointer-events-none">
      
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-category-1" />
        {t('screens.health.weeklyProgressConsistency')}
      </h3>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Consistency Score */}
        <div className="text-center p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <div className="relative w-20 h-20 mx-auto mb-2">
            {/* Circular Progress */}
            <svg className="w-full h-full -rotate-90">
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                fill="none" 
                stroke="currentColor" 
                className="text-muted-foreground" 
                strokeWidth="6" 
              />
              <circle 
                cx="40" 
                cy="40" 
                r="32" 
                fill="none" 
                stroke="currentColor"
                className="text-category-1 transition-all duration-1000"
                strokeWidth="6" 
                strokeDasharray={`${progress.consistencyScore * 2} ${200 - progress.consistencyScore * 2}`}
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-category-1">
                {progress.consistencyScore}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('screens.health.consistency')}</p>
        </div>
        
        {/* Avg Daily Intake */}
        <div className="text-center p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <Droplets className="w-6 h-6 mx-auto mb-2 text-category-3" />
          <p className="text-2xl font-bold">{(progress.avgDailyIntake / 1000).toFixed(1)}L</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.avgIntake')}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            <TrendingUp className="w-3 h-3 me-1" />
            +{progress.weeklyTrend}%
          </Badge>
        </div>
        
        {/* Streak Days */}
        <div className="text-center p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <Flame className="w-6 h-6 mx-auto mb-2 text-status-warning" />
          <p className="text-2xl font-bold">{progress.streakDays}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.dayStreak')}</p>
        </div>
        
        {/* Missed Days */}
        <div className="text-center p-4 rounded-xl bg-card/70 backdrop-blur-md">
          <CalendarX className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-2xl font-bold">{progress.missedDays}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.missedDays')}</p>
        </div>
      </div>
      
      {/* Recovery Impact */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-status-success-subtle to-status-success-subtle 
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
          {t('screens.health.properHydrationBoostingYourEnergyRecovery')}
        </p>
      </div>
      
      {/* AI Summary */}
      {aiSummary && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-category-1/10 to-category-3/10 
 border border-border60">
          <Brain className="w-5 h-5 text-category-1 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="text-sm font-medium italic text-muted-foreground/90">
            "{aiSummary}"
          </p>
        </div>
      )}
    </Card>
  );
}
