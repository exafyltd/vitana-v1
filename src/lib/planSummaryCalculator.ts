import { fmtDate } from '@/lib/locale-format';
import { t } from '@/lib/i18n-toast';
export interface PlanSummary {
  metricsLine: string;
  insightLine1: string;
  insightLine2: string;
  footerLine: string;
  status: "synced" | "manual" | "needs-update";
  lastUpdated: string;
}

export function calculatePlanSummary(plan: any): PlanSummary {
  const planType = plan.plan_type;
  const planData = plan.plan_data || {};
  const adherence = plan.adherence_score || 0;
  
  let metricsLine = "";
  let insightLine1 = "";
  let insightLine2 = "";
  
  let footerLine = "";
  
  switch (planType) {
    case "nutrition":
      metricsLine = t('screens.health.planSummary_nutrition_metrics');
      insightLine1 = t('screens.health.planSummary_nutrition_insight1');
      insightLine2 = t('screens.health.planSummary_nutrition_insight2');
      footerLine = t('screens.health.planSummary_nutrition_footer');
      break;

    case "exercise":
      metricsLine = t('screens.health.planSummary_exercise_metrics');
      insightLine1 = t('screens.health.planSummary_exercise_insight1');
      insightLine2 = t('screens.health.planSummary_exercise_insight2');
      footerLine = t('screens.health.planSummary_exercise_footer');
      break;

    case "hydration":
      metricsLine = t('screens.health.planSummary_hydration_metrics');
      insightLine1 = t('screens.health.planSummary_hydration_insight1');
      insightLine2 = t('screens.health.planSummary_hydration_insight2');
      footerLine = t('screens.health.planSummary_hydration_footer');
      break;

    case "sleep":
      metricsLine = t('screens.health.planSummary_sleep_metrics');
      insightLine1 = t('screens.health.planSummary_sleep_insight1');
      insightLine2 = t('screens.health.planSummary_sleep_insight2');
      footerLine = t('screens.health.planSummary_sleep_footer');
      break;

    case "mental":
      metricsLine = t('screens.health.planSummary_mental_metrics');
      insightLine1 = t('screens.health.planSummary_mental_insight1');
      insightLine2 = t('screens.health.planSummary_mental_insight2');
      footerLine = t('screens.health.planSummary_mental_footer');
      break;

    case "supplement":
      metricsLine = t('screens.health.planSummary_supplement_metrics');
      insightLine1 = t('screens.health.planSummary_supplement_insight1');
      insightLine2 = t('screens.health.planSummary_supplement_insight2');
      footerLine = t('screens.health.planSummary_supplement_footer');
      break;

    default:
      metricsLine = t('screens.health.planSummary_default_metrics');
      insightLine1 = "";
      insightLine2 = "";
      footerLine = "";
  }
  
  // Determine status
  const status = plan.is_ai_generated 
    ? "synced" 
    : adherence < 50 
    ? "needs-update" 
    : "manual";
  
  // Calculate last updated
  const lastUpdated = plan.last_updated 
    ? getRelativeTime(new Date(plan.last_updated))
    : "Never";
  
  return {
    metricsLine,
    insightLine1,
    insightLine2,
    footerLine,
    status,
    lastUpdated
  };
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return fmtDate(date);
}
