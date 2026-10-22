import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExerciseProgress } from "@/types/exercise";
import { 
  TrendingUp, 
  Clock, 
  Flame, 
  Heart, 
  CheckCircle2,
  Brain 
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ProgressDashboardProps {
  progress: ExerciseProgress;
  aiSummary?: string;
}

export function ProgressDashboard({ progress, aiSummary }: ProgressDashboardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-surface-sunken via-category-3/5 to-category-2/5 
">
      
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-category-3" />
        {t('screens.health.weeklyProgressConsistency')}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-card/60">
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-status-success" />
          <p className="text-2xl font-bold">
            {progress.workoutsCompleted}/{progress.workoutsTotal}
          </p>
          <p className="text-xs text-muted-foreground">{t('screens.health.workouts')}</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-card/60">
          <Clock className="w-6 h-6 mx-auto mb-2 text-category-3" />
          <p className="text-2xl font-bold">{progress.avgWorkoutTime}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.avgMinutes')}</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-card/60">
          <Flame className="w-6 h-6 mx-auto mb-2 text-status-warning" />
          <p className="text-2xl font-bold">{progress.totalCaloriesBurned}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.calBurned')}</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-card/60">
          <Heart className="w-6 h-6 mx-auto mb-2 text-category-4" />
          <p className="text-2xl font-bold">{progress.recoveryScore}/100</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.recovery')}</p>
          <Badge variant="outline" className="mt-1 text-xs">
            <TrendingUp className="w-3 h-3 me-1" />
            +5
          </Badge>
        </div>
      </div>
      
      {aiSummary && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-status-success/10 to-status-success/10 
 border border-border30">
          <Brain className="w-5 h-5 text-status-success flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground italic">
            "{aiSummary}"
          </p>
        </div>
      )}
    </Card>
  );
}
