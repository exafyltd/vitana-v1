import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, Moon, Sparkles } from "lucide-react";
import { SleepPlanData } from "@/types/sleep";

interface SleepOverviewCardProps {
  planData: SleepPlanData;
  onRecalibrate?: () => void;
}

export function SleepOverviewCard({ planData, onRecalibrate }: SleepOverviewCardProps) {
  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-[hsl(230,100%,90%)]/30 via-[hsl(270,50%,90%)]/40 to-[hsl(210,100%,97%)]/40 
      dark:from-[hsl(222,61%,7%)]/90 dark:via-[hsl(230,32%,11%)]/90 dark:to-[hsl(216,31%,15%)]/90 
      backdrop-blur-sm border-indigo-200/50 dark:border-slate-700/50">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pt-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <h2 className="text-xl font-bold">Your Sleep Plan, Powered by Autopilot</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Smart sleep guidance tuned to your circadian rhythm, recovery needs, and daily performance
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          AI Optimized
        </Badge>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Goal Focus */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Goal Focus</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Schedule</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Consistent bedtime {planData.targetBedtime}
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Progress</span>
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
            Tracking your average sleep quality over time...
          </span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {planData.completionPercentage}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage} 
          className="h-3 transition-all ease-in-out duration-1200"
        />
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 
        dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/30 dark:border-indigo-700/30 mb-4">
        <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">AI Insight</p>
            <span className="text-xs text-slate-500/90 dark:text-slate-400/80 whitespace-nowrap">
              Last updated {planData.lastUpdated}
            </span>
          </div>
          <p className="text-sm font-medium italic text-slate-700/90 dark:text-slate-300/90">
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
        Recalibrate Plan
      </Button>
      
      {/* Helper Text */}
      <p className="text-xs text-center text-slate-500/90 dark:text-slate-400/80 mt-2">
        Recalibration adjusts your sleep goals based on fatigue, activity, and circadian patterns
      </p>
    </Card>
  );
}
