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
    <Card className="p-6 mb-6 bg-gradient-to-br from-sky-50/50 via-cyan-50/30 to-blue-50/50 
      dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 
      backdrop-blur-sm border-cyan-200/50 dark:border-slate-700/50">
      
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Goal Focus */}
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-medium text-muted-foreground">Goal Focus</span>
          </div>
          <p className="text-lg font-bold">{planData.goalFocus}</p>
        </div>
        
        {/* Schedule */}
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-medium text-muted-foreground">Schedule</span>
          </div>
          <p className="text-lg font-bold">
            {planData.schedule}
          </p>
          <p className="text-xs text-muted-foreground">
            {(planData.dailyTargetMl / 1000).toFixed(1)}L daily target
          </p>
        </div>
        
        {/* Program Progress */}
        <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
          </div>
          <p className="text-lg font-bold">
            Week {planData.currentWeek} of {planData.totalWeeks}
          </p>
          <p className="text-xs text-muted-foreground">
            {planData.completionPercentage}% complete
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Tracking your weekly consistency...
          </span>
          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
            {planData.completionPercentage}%
          </span>
        </div>
        <Progress 
          value={planData.completionPercentage} 
          className="h-3"
        />
      </div>
      
      {/* AI Insight */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
        dark:from-cyan-500/20 dark:to-blue-500/20 border border-cyan-200/30 dark:border-cyan-700/30 mb-4">
        <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-1">
            <p className="text-sm font-medium">AI Insight</p>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Last updated {planData.lastUpdated}
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic">
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
