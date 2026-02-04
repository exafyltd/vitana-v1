import { Brain } from "lucide-react";
import { AutopilotInsight } from "@/services/autopilotContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface AutopilotInsightBannerProps {
  insights: AutopilotInsight[];
  synergyScore: number;
  synergyTrend: number;
}

export function AutopilotInsightBanner({ 
  insights, 
  synergyScore, 
  synergyTrend 
}: AutopilotInsightBannerProps) {
  const { translate } = useTranslation();

  const statusConfig = {
    "balanced": { icon: "🟢", color: "text-emerald-600 dark:text-emerald-400", labelKey: "autopilot.insightBanner.statusBalanced" },
    "needs-attention": { icon: "🟠", color: "text-amber-600 dark:text-amber-400", labelKey: "autopilot.insightBanner.statusNeedsAttention" },
    "improving": { icon: "🟣", color: "text-violet-600 dark:text-violet-400", labelKey: "autopilot.insightBanner.statusImproving" }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 mb-6 shadow-[0_6px_20px_rgba(20,25,40,0.06)]">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10">
          <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {translate('autopilot.insightBanner.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {translate('autopilot.insightBanner.description')}
          </p>
          
          {/* Insights */}
          <div className="space-y-2 mb-4">
            {insights.map((insight, idx) => {
              const config = statusConfig[insight.status];
              return (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-base">{config.icon}</span>
                  <span className={cn("font-medium capitalize", config.color)}>
                    {translate(config.labelKey)}:
                  </span>
                  <span className="text-foreground/80">{insight.label}</span>
                </div>
              );
            })}
          </div>
          
          {/* Synergy Index */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {translate('autopilot.insightBanner.synergyIndex')}:
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {synergyScore} / 100
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                (+{synergyTrend}%)
              </span>
            </div>
            
            {/* Synergy Progress Bar */}
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-xs">
              <div 
                className="h-full bg-violet-500 dark:bg-violet-400 rounded-full transition-all duration-500"
                style={{ width: `${synergyScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
