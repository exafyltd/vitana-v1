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

interface SleepDashboardProps {
  progress: SleepProgress;
  aiSummary?: string;
}

export function SleepDashboard({ progress, aiSummary }: SleepDashboardProps) {
  return (
    <Card className="p-6 bg-gradient-to-br from-[hsl(230,100%,90%)]/30 via-[hsl(270,50%,90%)]/40 to-[hsl(210,100%,97%)]/40 
      dark:from-[hsl(222,61%,7%)]/90 dark:via-[hsl(230,32%,11%)]/90 dark:to-[hsl(216,31%,15%)]/90">
      
      <h3 className="text-xl font-semibold tracking-tight mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Weekly Sleep Analytics
      </h3>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Average Duration */}
        <div className="text-center p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
          <p className="text-2xl font-bold">{progress.avgDuration}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Avg Duration</p>
        </div>
        
        {/* Consistency Score */}
        <div className="text-center p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="relative w-16 h-16 mx-auto mb-2">
            {/* Circular Progress */}
            <svg className="w-full h-full -rotate-90">
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                fill="none" 
                stroke="currentColor" 
                className="text-slate-200 dark:text-slate-700" 
                strokeWidth="5" 
              />
              <circle 
                cx="32" 
                cy="32" 
                r="28" 
                fill="none" 
                stroke="currentColor"
                className="text-purple-500 transition-all duration-1000"
                strokeWidth="5" 
                strokeDasharray={`${progress.consistencyScore * 1.76} ${176 - progress.consistencyScore * 1.76}`}
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                {progress.consistencyScore}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Consistency</p>
          <Badge variant="outline" className="mt-1 text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{progress.consistencyTrend}%
          </Badge>
        </div>
        
        {/* Deep Sleep */}
        <div className="text-center p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <Activity className="w-6 h-6 mx-auto mb-2 text-sky-600 dark:text-sky-400" />
          <p className="text-2xl font-bold">{progress.deepSleepPercentage}%</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Deep Sleep</p>
        </div>
        
        {/* Streak Days */}
        <div className="text-center p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <Flame className="w-6 h-6 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
          <p className="text-2xl font-bold">{progress.streakDays}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Day Streak</p>
        </div>
      </div>
      
      {/* Recovery Impact */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50 
        dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/30 dark:border-emerald-700/30 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium">Recovery Impact</span>
          </div>
          <Badge className="bg-emerald-500 hover:bg-emerald-600">
            {progress.recoveryImpact}
          </Badge>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          Quality sleep is improving your energy and performance metrics
        </p>
      </div>
      
      {/* AI Summary */}
      {aiSummary && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
          dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/30 dark:border-indigo-700/30">
          <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="text-sm text-slate-600 dark:text-slate-400 italic">
            "{aiSummary}"
          </p>
        </div>
      )}
    </Card>
  );
}
