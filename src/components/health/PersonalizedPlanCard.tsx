import { useNavigate } from "react-router-dom";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { cn } from "@/lib/utils";
import { calculatePlanSummary } from "@/lib/planSummaryCalculator";
import { getMockPlan } from "@/lib/mockPlanData";
import { 
  Apple, 
  Dumbbell, 
  Droplet, 
  Moon, 
  Brain, 
  Plus,
  CheckCircle2
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

const PLAN_CARD_GRADIENTS: Record<string, string> = {
  nutrition: "bg-gradient-to-br from-emerald-50/80 via-white/70 to-emerald-100/60 dark:from-emerald-950/40 dark:via-slate-900/50 dark:to-emerald-900/30",
  exercise: "bg-gradient-to-br from-sky-50/80 via-white/70 to-indigo-100/60 dark:from-sky-950/40 dark:via-slate-900/50 dark:to-indigo-900/30",
  hydration: "bg-gradient-to-br from-cyan-50/80 via-white/70 to-teal-100/60 dark:from-cyan-950/40 dark:via-slate-900/50 dark:to-teal-900/30",
  sleep: "bg-gradient-to-br from-indigo-50/80 via-white/70 to-violet-100/60 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-violet-900/30",
  mental: "bg-gradient-to-br from-rose-50/80 via-white/70 to-pink-100/60 dark:from-rose-950/40 dark:via-slate-900/50 dark:to-pink-900/30",
  supplement: "bg-gradient-to-br from-amber-50/80 via-white/70 to-orange-100/60 dark:from-amber-950/40 dark:via-slate-900/50 dark:to-orange-900/30"
};

const PROGRESS_LABELS: Record<string, string> = {
  nutrition: "Completion",
  exercise: "Week Progress",
  hydration: "Daily Goal",
  sleep: "Sleep Score",
  mental: "Streak Progress",
  supplement: "Adherence"
};

const PLAN_CONTAINED_BAR_GRADIENTS: Record<string, string> = {
  nutrition: "bg-gradient-to-r from-emerald-400/80 to-emerald-600/80",
  exercise: "bg-gradient-to-r from-blue-400/80 to-blue-600/80",
  hydration: "bg-gradient-to-r from-cyan-400/80 to-cyan-600/80",
  sleep: "bg-gradient-to-r from-indigo-400/80 to-indigo-600/80",
  mental: "bg-gradient-to-r from-rose-400/80 to-rose-600/80",
  supplement: "bg-gradient-to-r from-amber-400/80 to-amber-600/80"
};

const PLAN_PROGRESS_COLORS: Record<string, string> = {
  nutrition: "bg-emerald-500",
  exercise: "bg-blue-500",
  hydration: "bg-cyan-500",
  sleep: "bg-indigo-500",
  mental: "bg-rose-500",
  supplement: "bg-amber-500"
};

interface PersonalizedPlanCardProps {
  type: 'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'mental' | 'supplement';
  detailed?: boolean;
}

export function PersonalizedPlanCard({ type, detailed = false }: PersonalizedPlanCardProps) {
  const { plans, isLoading } = useHealthPlans();
  const navigate = useNavigate();
  
  const realPlan = plans?.find(p => p.plan_type === type);
  const plan = realPlan || getMockPlan(type); // Always show data
  
  const Icon = PLAN_ICONS[type];
  const colorClass = PLAN_COLORS[type];
  const glowClass = PLAN_GLOWS[type];
  const dotColor = PLAN_DOT_COLORS[type];
  const gradientClass = PLAN_CARD_GRADIENTS[type];
  const progressLabel = PROGRESS_LABELS[type];
  const containedBarGradient = PLAN_CONTAINED_BAR_GRADIENTS[type];
  const progressColor = PLAN_PROGRESS_COLORS[type];
  
  const planName = type.charAt(0).toUpperCase() + type.slice(1) + " Plan";
  
  // Calculate live summary data - always available now
  const summary = calculatePlanSummary(plan);
  
  const statusConfig = {
    "synced": { label: "AI Optimized ✅", bg: "bg-emerald-100/60 dark:bg-emerald-800/60", text: "text-emerald-700 dark:text-emerald-300" },
    "manual": { label: "Manual 📝", bg: "bg-slate-100/60 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400" },
    "needs-update": { label: "Needs Update ⚠️", bg: "bg-amber-100/60 dark:bg-amber-800/60", text: "text-amber-700 dark:text-amber-300" }
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl backdrop-blur-md",
        "border border-slate-200/60 dark:border-slate-800/60",
        "shadow-sm hover:shadow-lg transition-all duration-200 ease-out",
        "hover:-translate-y-[2px]",
        "motion-reduce:hover:translate-y-0",
        "bg-white/90 dark:bg-slate-900/90",
        "supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:dark:bg-slate-900/70",
        "h-[220px]",
        gradientClass
      )}
    >
      {/* Top-Right Meta Badge - z-20 (Always Visible) */}
      <div 
        className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm px-2 py-1 shadow-sm"
        aria-label={`AI Optimized ${summary.lastUpdated}`}
      >
        <CheckCircle2 className="w-3 h-3" style={{ color: dotColor }} />
        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
          AI Optimized
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          · {summary.lastUpdated}
        </span>
      </div>

      {/* Content Container - z-10 */}
      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Header Row: Icon + Title */}
        <div className="flex items-center gap-3 pb-2">
          <div className={cn(
            "inline-flex p-3 rounded-xl bg-gradient-to-br transition-all duration-300",
            colorClass,
            "group-hover:ring-1 group-hover:ring-offset-2",
            type === "nutrition" && "group-hover:ring-emerald-500/10",
            type === "exercise" && "group-hover:ring-blue-500/10",
            type === "hydration" && "group-hover:ring-cyan-500/10",
            type === "sleep" && "group-hover:ring-indigo-500/10",
            type === "mental" && "group-hover:ring-rose-500/10",
            type === "supplement" && "group-hover:ring-amber-500/10"
          )}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {planName}
          </h3>
        </div>

        {/* Contained Status Bar - inset, rounded */}
        <div 
          className={cn(
            "mt-1 mb-3 mx-auto w-[calc(100%-2rem)] h-[6px] rounded-full opacity-40 group-hover:opacity-60 transition-opacity duration-200",
            containedBarGradient
          )}
          role="presentation"
          aria-hidden="true"
        />

        {/* Metrics Line with gradient dot */}
        <div className="flex items-center gap-1.5 pt-0">
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
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-1 italic">
            {summary.insightLine1}
          </p>
        )}

        {/* Footer Row with Progress Pill */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-2">
          {/* Left: Progress Pill with Mini Bar */}
          <div 
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1"
            aria-label={`Progress ${plan.adherence_score} percent`}
          >
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Progress {plan.adherence_score}%
            </span>
            
            {/* Mini Progress Bar */}
            <div className="h-[4px] w-[56px] rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                style={{ width: `${plan.adherence_score}%` }}
              />
            </div>
          </div>
          
          {/* Right: Footer Text */}
          <div className="text-[11px] text-muted-foreground">
            {summary.footerLine}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          {realPlan ? (
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
    </div>
  );
}
