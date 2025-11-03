export interface PlanSummary {
  metricsLine: string;
  insightLine1: string;
  insightLine2: string;
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
  
  switch (planType) {
    case "nutrition":
      metricsLine = "5 meals · Avg 2100 kcal · Balanced macros";
      insightLine1 = "Protein: 96g (↑8%) · Fiber: 32g";
      insightLine2 = "Hydration linked · Sleep optimized";
      break;
      
    case "exercise":
      metricsLine = "4 sessions / week · Strength & Mobility";
      insightLine1 = "Last Workout: Yesterday · Recovery +7%";
      insightLine2 = "Sleep correlation: Excellent (7.8h avg)";
      break;
      
    case "hydration":
      metricsLine = "8 glasses / day · 72% consistency";
      insightLine1 = "Peak intake at 11 AM";
      insightLine2 = "AI added +300ml due to exercise load";
      break;
      
    case "sleep":
      metricsLine = "7.5h avg · Sleep Score 86/100";
      insightLine1 = "Deep Sleep ↑6% · REM Stable";
      insightLine2 = "Evening routine consistent";
      break;
      
    case "mental":
      metricsLine = "10 min reflection · 9-day streak";
      insightLine1 = "Focus +12% · Stress -8%";
      insightLine2 = "Autopilot adjusted duration";
      break;
      
    case "supplement":
      metricsLine = "3 supplements tracked · Adherence 98%";
      insightLine1 = "Magnesium AM · Vitamin D · Omega-3";
      insightLine2 = "Hydration boost identified from Magnesium";
      break;
      
    default:
      metricsLine = "No data available";
      insightLine1 = "";
      insightLine2 = "";
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
  return date.toLocaleDateString();
}
