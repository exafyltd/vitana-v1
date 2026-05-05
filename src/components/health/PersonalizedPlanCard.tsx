import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { cn } from "@/lib/utils";
import { calculatePlanSummary } from "@/lib/planSummaryCalculator";
import { getMockPlan } from "@/lib/mockPlanData";
import { toast } from "sonner";
import { 
  Apple, 
  Dumbbell, 
  Droplet, 
  Moon, 
  Brain, 
  Plus,
  Zap,
  RotateCw
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

const PLAN_ICONS: Record<string, any> = {
  nutrition: Apple,
  exercise: Dumbbell,
  hydration: Droplet,
  sleep: Moon,
  mental: Brain,
  supplement: Plus
};

const PLAN_DOT_COLORS: Record<string, string> = {
  nutrition: "#10b981",
  exercise: "#3b82f6",
  hydration: "#06b6d4",
  sleep: "#6366f1",
  mental: "#f43f5e",
  supplement: "#f59e0b"
};

const PLAN_ACCENT_CHIPS: Record<string, string> = {
  nutrition: "bg-emerald-50 text-emerald-700 border-emerald-200",
  exercise: "bg-blue-50 text-blue-700 border-blue-200",
  hydration: "bg-cyan-50 text-cyan-700 border-cyan-200",
  sleep: "bg-indigo-50 text-indigo-700 border-indigo-200",
  mental: "bg-rose-50 text-rose-700 border-rose-200",
  supplement: "bg-amber-50 text-amber-700 border-amber-200"
};

interface PersonalizedPlanCardProps {
  type: 'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'mental' | 'supplement';
  detailed?: boolean;
  onGenerateClick?: () => void;
}

export function PersonalizedPlanCard({ 
  type, 
  detailed = false,
  onGenerateClick
}: PersonalizedPlanCardProps) {
  const { plans, isLoading, generatePlan } = useHealthPlans();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const realPlan = plans?.find(p => p.plan_type === type);
  const plan = realPlan || getMockPlan(type); // Always show data
  const isGenerating = generatePlan.isPending;
  
  const Icon = PLAN_ICONS[type];
  const dotColor = PLAN_DOT_COLORS[type];
  const accentChip = PLAN_ACCENT_CHIPS[type];
  
  const planName = type.charAt(0).toUpperCase() + type.slice(1) + " Plan";
  
  // Calculate live summary data - always available now
  const summary = calculatePlanSummary(plan);
  
  // Refresh handler
  const handleRefreshPlan = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['health-plans'] });
    toast.success(`${planName} refreshed! 🔄`);
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  const statusConfig = {
    "synced": { label: "AI Optimized ✅", bg: "bg-emerald-100/60 dark:bg-emerald-800/60", text: "text-emerald-700 dark:text-emerald-300" },
    "manual": { label: "Manual 📝", bg: "bg-slate-100/60 dark:bg-slate-800/60", text: "text-slate-600 dark:text-slate-400" },
    "needs-update": { label: "Needs Update ⚠️", bg: "bg-amber-100/60 dark:bg-amber-800/60", text: "text-amber-700 dark:text-amber-300" }
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-white dark:bg-slate-900",
        "shadow-[0_6px_20px_rgba(20,25,40,0.06)] hover:shadow-[0_10px_28px_rgba(20,25,40,0.10)]",
        "transition-shadow duration-200",
        "hover:-translate-y-[1px] transform-gpu",
        "motion-reduce:hover:translate-y-0",
        "h-auto min-h-[240px]"
      )}
    >
      {/* Top-Right Meta Badge - z-20 (Always Visible) */}
      <div 
        className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 px-2.5 py-1 text-[12px] font-medium"
        aria-label={`AI Optimized ${summary.lastUpdated}`}
      >
        <span>{t('screens.health.aiOptimized')}</span>
        <span className="text-slate-400 dark:text-slate-500">•</span>
        <span>{summary.lastUpdated}</span>
      </div>

      {/* Content Container - z-10 */}
      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full">
        {/* Header Row: Icon + Title + Chip */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5">
            {/* Icon Badge - Smaller, neutral container */}
            <div className="inline-flex p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Icon className="w-5 h-5" style={{ color: dotColor }} />
            </div>
            
            {/* Title */}
            <h3 className="text-[15px] md:text-[16px] font-semibold text-slate-900 dark:text-white">
              {planName}
            </h3>
            
            {/* Accent Chip */}
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
              accentChip
            )}>
              {t('screens.health.active')}
            </span>
          </div>
        </div>

        {/* Subtle Divider */}
        <div 
          className="h-[6px] rounded-full bg-slate-100 dark:bg-slate-800 mt-3 mb-4"
          role="presentation"
          aria-hidden="true"
        />

        {/* Body Content - Two Columns on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Left Column: Key Metric */}
          <div className="flex items-start gap-2">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" 
              style={{ backgroundColor: dotColor }}
            />
            <p className="text-[13px] leading-5 text-slate-700 dark:text-slate-300">
              {summary.metricsLine}
            </p>
          </div>
          
          {/* Right Column: AI Action */}
          <div className="flex items-start gap-2">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" 
              style={{ backgroundColor: dotColor }}
            />
            <p className="text-[13px] leading-5 text-slate-700 dark:text-slate-300">
              {summary.insightLine1}
            </p>
          </div>
        </div>

        {/* Progress + Meta Row */}
        <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Progress Bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                {t('screens.health.progress')}
              </span>
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                {plan.adherence_score}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full rounded-full bg-slate-900/80 dark:bg-slate-100/80 transition-all duration-500"
                style={{ width: `${plan.adherence_score}%` }}
              />
            </div>
          </div>
          
          {/* Meta Text */}
          <div className="text-[12px] text-slate-500 dark:text-slate-400 text-right">
            {summary.footerLine}
          </div>
        </div>

        {/* Primary Action */}
        <div className="flex gap-2">
          {realPlan ? (
            <>
              <button
                onClick={() => navigate(`/health/plans/${type}`)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-[13px] font-medium transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {t('screens.health.viewPlan')}
              </button>
              <button
                onClick={handleRefreshPlan}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center rounded-full h-9 w-9 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t('screens.health.refreshPlan')}
              >
                <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
            </>
          ) : (
            <button
              onClick={onGenerateClick}
              disabled={isGenerating}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full h-9 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className={cn("w-3.5 h-3.5", isGenerating && "animate-pulse")} />
              {isGenerating ? "Generating..." : "Generate Plan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
