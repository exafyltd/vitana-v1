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
      metricsLine = "5 meals/day · Avg 2100 kcal · Balanced macros";
      insightLine1 = "🧩 Autopilot optimized breakfast protein for muscle recovery";
      insightLine2 = "Protein: 96g (↑8%) · Fiber: 32g";
      footerLine = "Last updated 2h ago · AI Synced ✅";
      break;
      
    case "exercise":
      metricsLine = "4 sessions/week · Strength & Mobility";
      insightLine1 = "💪 Recovery load adjusted for better shoulder stability";
      insightLine2 = "Last Workout: Yesterday · Recovery +7%";
      footerLine = "Next session: Tomorrow 7 AM · Recalibration Active";
      break;
      
    case "hydration":
      metricsLine = "8 glasses/day · 72% consistency";
      insightLine1 = "💧 AI added +300ml due to high temperature and exercise";
      insightLine2 = "2.3L avg intake · Goal met 4 days in a row";
      footerLine = "Peak intake at 11 AM";
      break;
      
    case "sleep":
      metricsLine = "7.5h avg · Sleep Score 86/100";
      insightLine1 = "💤 Autopilot shifted bedtime +15min for better deep sleep";
      insightLine2 = "Deep Sleep ↑6% · REM Stable · Consistency ↑12%";
      footerLine = "Evening routine consistent";
      break;
      
    case "mental":
      metricsLine = "10 min reflection · 9-day streak";
      insightLine1 = "🌿 Stress ↓8% · Focus +12% · Mood Improving";
      insightLine2 = "Mind coach: 'Keep steady reflection rhythm'";
      footerLine = "Mindfulness sessions optimized";
      break;
      
    case "supplement":
      metricsLine = "3 supplements · 98% adherence";
      insightLine1 = "⚗️ Magnesium AM boost linked to hydration gain +4%";
      insightLine2 = "AI tracking dosage timing sync";
      footerLine = "Vitamin D · Omega-3 · Magnesium";
      break;
      
    default:
      metricsLine = "No data available";
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
  return date.toLocaleDateString();
}
