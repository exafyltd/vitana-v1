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
    <Card className="p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 
      dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50">
      
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Weekly Progress & Consistency
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60">
          <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
          <p className="text-2xl font-bold">
            {progress.workoutsCompleted}/{progress.workoutsTotal}
          </p>
          <p className="text-xs text-muted-foreground">Workouts</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60">
          <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
          <p className="text-2xl font-bold">{progress.avgWorkoutTime}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.avgMinutes')}</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60">
          <Flame className="w-6 h-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
          <p className="text-2xl font-bold">{progress.totalCaloriesBurned}</p>
          <p className="text-xs text-muted-foreground">{t('screens.health.calBurned')}</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60">
          <Heart className="w-6 h-6 mx-auto mb-2 text-rose-600 dark:text-rose-400" />
          <p className="text-2xl font-bold">{progress.recoveryScore}/100</p>
          <p className="text-xs text-muted-foreground">Recovery</p>
          <Badge variant="outline" className="mt-1 text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            +5
          </Badge>
        </div>
      </div>
      
      {aiSummary && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 
          dark:from-green-500/20 dark:to-emerald-500/20 border border-green-200/30 dark:border-green-700/30">
          <Brain className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground italic">
            "{aiSummary}"
          </p>
        </div>
      )}
    </Card>
  );
}
