import { useNavigate } from "react-router-dom";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { cn } from "@/lib/utils";
import { calculatePlanSummary } from "@/lib/planSummaryCalculator";
import { 
  Apple, 
  Dumbbell, 
  Droplet, 
  Moon, 
  Brain, 
  Plus
} from "lucide-react";

const PLAN_ICONS: Record<string, any> = {
  nutrition: Apple,
  exercise: Dumbbell,
  hydration: Droplet,
  sleep: Moon,
  mental: Brain,
  supplement: Plus
};

const PLAN_COLORS: Record<string, string> = {
  nutrition: "from-emerald-500 to-emerald-600",
  exercise: "from-blue-500 to-blue-600",
  hydration: "from-cyan-500 to-cyan-600",
  sleep: "from-indigo-500 to-indigo-600",
  mental: "from-rose-500 to-rose-600",
  supplement: "from-amber-500 to-amber-600"
};

const PLAN_GLOWS: Record<string, string> = {
  nutrition: "shadow-emerald-200/40 dark:shadow-emerald-900/20",
  exercise: "shadow-blue-200/40 dark:shadow-blue-900/20",
  hydration: "shadow-cyan-200/40 dark:shadow-cyan-900/20",
  sleep: "shadow-indigo-200/40 dark:shadow-indigo-900/20",
  mental: "shadow-rose-200/40 dark:shadow-rose-900/20",
  supplement: "shadow-amber-200/40 dark:shadow-amber-900/20"
};

const PLAN_DOT_COLORS: Record<string, string> = {
  nutrition: "#10b981",
  exercise: "#3b82f6",
  hydration: "#06b6d4",
  sleep: "#6366f1",
  mental: "#f43f5e",
  supplement: "#f59e0b"
};

interface PersonalizedPlanCardProps {
  type: 'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'mental' | 'supplement';
  detailed?: boolean;
}

export function PersonalizedPlanCard({ type, detailed = false }: PersonalizedPlanCardProps) {
  const { plans, isLoading } = useHealthPlans();
  const navigate = useNavigate();
  
  const plan = plans?.find(p => p.plan_type === type);
  const Icon = PLAN_ICONS[type];
  const colorClass = PLAN_COLORS[type];
  const glowClass = PLAN_GLOWS[type];
  const dotColor = PLAN_DOT_COLORS[type];
  
  const planName = type.charAt(0).toUpperCase() + type.slice(1) + " Plan";
  
  // Calculate live summary data
  const summary = plan ? calculatePlanSummary(plan) : null;
  
  const statusConfig = {
    "synced": { label: "AI Optimized ✅", bg: "bg-emerald-100/60 dark:bg-emerald-800/60", text: "text-emerald-700 dark:text-emerald-300" },
    "manual": { label: "Manual 📝", bg: "bg-slate-100/60 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400" },
    "needs-update": { label: "Needs Update ⚠️", bg: "bg-amber-100/60 dark:bg-amber-800/60", text: "text-amber-700 dark:text-amber-300" }
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 p-6 shadow-sm transition-all hover:translate-y-[-3px] hover:scale-[1.03] hover:shadow-lg duration-300",
        "h-[220px] flex flex-col"
      )}
    >
      {/* Status Indicator & Timestamp */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {summary && (
          <div className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-medium",
            statusConfig[summary.status].bg,
            statusConfig[summary.status].text
          )}>
            {statusConfig[summary.status].label}
          </div>
        )}
        {summary && (
          <span className="text-[11px] text-muted-foreground">
            {summary.lastUpdated}
          </span>
        )}
      </div>
      
      {/* Icon with Glow */}
      <div className={cn(
        "mb-3 inline-flex p-3 rounded-xl bg-gradient-to-br transition-all duration-300",
        colorClass,
        glowClass,
        plan?.ai_generated && summary?.status === "synced" && "animate-pulse-glow"
      )}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Title & Live Metrics */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {planName}
        </h3>
        
        {summary ? (
          <>
            {/* Metrics Line with gradient dot */}
            <div className="flex items-center gap-1.5 mb-2">
              <div 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                style={{ backgroundColor: dotColor }}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {summary.metricsLine}
              </p>
            </div>
            
            {/* Insight Lines */}
            {summary.insightLine1 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <span className="text-indigo-500">🔹</span>
                {summary.insightLine1}
              </p>
            )}
            {summary.insightLine2 && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1">
                <span className="text-indigo-500">🔹</span>
                {summary.insightLine2}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No plan generated yet
            </p>
          </div>
        )}

        {plan ? (
          <>
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Adherence
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {plan.adherence_score}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-200/50 dark:bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${plan.adherence_score}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="mb-3">
            <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                No plan generated yet
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        {plan ? (
          <>
            <button
              onClick={() => navigate(`/health/plans/${type}`)}
              className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              🔍 View Plan
            </button>
            <button
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-sm font-semibold rounded-lg transition-colors"
            >
              ↻
            </button>
          </>
        ) : (
          <button
            className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            ⚡ Generate Plan
          </button>
        )}
      </div>
    </div>
  );
}
