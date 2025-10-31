import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Calendar, Clock, Droplets, Sparkles } from "lucide-react";
import { HydrationPlanData } from "@/types/hydration";

interface HydrationOverviewCardProps {
  planData: HydrationPlanData;
  onRecalibrate?: () => void;
}

export function HydrationOverviewCard({ planData, onRecalibrate }: HydrationOverviewCardProps) {
  return (
    <Card className="p-6 pt-10 mb-6 bg-gradient-to-br from-[hsl(197,84%,81%)]/60 via-[hsl(194,79%,63%)]/50 to-[hsl(199,100%,96%)]/40 
      dark:from-[hsl(210,35%,17%)]/80 dark:via-[hsl(210,48%,12%)]/80 dark:to-[hsl(210,55%,8%)]/80 
      backdrop-blur-md border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xl font-bold">Your Hydration Plan, Powered by Autopilot</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Smart hydration guidance tailored to your lifestyle, activity, and environment
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
        <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400 transition-all duration-900" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Goal Focus</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 transition-all duration-900" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Schedule</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {(planData.dailyTargetMl / 1000).toFixed(1)}L daily target
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 transition-all duration-900" />
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tracking-tight">
            Tracking your weekly consistency...
          </span>
          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
            {planData.completionPercentage}%
          </span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200/50 dark:bg-slate-800/50">
          <div 
            className="h-full bg-gradient-to-r from-sky-400 to-cyan-500 opacity-80 transition-all ease-in-out duration-1200 rounded-full"
            style={{ width: `${planData.completionPercentage}%` }}
          />
        </div>
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
        dark:from-cyan-500/20 dark:to-blue-500/20 border border-slate-200/60 dark:border-slate-700/60 mb-4">
        <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">AI Insight</p>
            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
      <p className="text-xs text-center text-muted-foreground mt-2">
        Recalibration adjusts hydration goals based on temperature, activity, and sleep
      </p>
    </Card>
  );
}
