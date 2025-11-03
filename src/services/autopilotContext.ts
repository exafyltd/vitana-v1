import { getVitanaIndexTier } from "@/lib/vitanaIndex";

export interface AutopilotInsight {
  status: "balanced" | "needs-attention" | "improving";
  label: string;
  pillars: string[];
}

export interface PillarSynergy {
  from: string;
  to: string;
  impact: string;
  type: "positive" | "negative" | "neutral";
  icons: { from: string; to: string };
}

export interface AutopilotContextData {
  synergyScore: number;
  synergyTrend: number;
  insights: AutopilotInsight[];
  relationships: PillarSynergy[];
  lastRecalibration: string;
  nextRecalibration: string;
  lastAdjustment: string;
  vitanaScore: number;
}

export function calculateAutopilotContext(plans: any[]): AutopilotContextData {
  // Use fixed synergy score for consistent demo
  const synergyScore = 84;
  
  // Generate insights based on adherence patterns
  const insights: AutopilotInsight[] = [];
  
  const sleepPlan = plans.find(p => p.plan_type === "sleep");
  const hydrationPlan = plans.find(p => p.plan_type === "hydration");
  const nutritionPlan = plans.find(p => p.plan_type === "nutrition");
  const mentalPlan = plans.find(p => p.plan_type === "mental");
  const exercisePlan = plans.find(p => p.plan_type === "exercise");
  const supplementPlan = plans.find(p => p.plan_type === "supplement");
  
  // Check balanced pillars
  if (sleepPlan && hydrationPlan && 
      sleepPlan.adherence_score > 80 && hydrationPlan.adherence_score > 75) {
    insights.push({
      status: "balanced",
      label: "Sleep + Hydration",
      pillars: ["sleep", "hydration"]
    });
  }
  
  // Check pillars needing attention
  if (nutritionPlan && nutritionPlan.adherence_score < 70) {
    insights.push({
      status: "needs-attention",
      label: "Nutrition variety",
      pillars: ["nutrition"]
    });
  }
  
  // Check improving pillars
  if (mentalPlan && mentalPlan.adherence_score >= 70 && mentalPlan.adherence_score < 85) {
    insights.push({
      status: "improving",
      label: "Mental",
      pillars: ["mental"]
    });
  }
  
  // Exercise recovery needs attention
  if (exercisePlan && exercisePlan.adherence_score > 70 && sleepPlan && sleepPlan.adherence_score < 70) {
    insights.push({
      status: "needs-attention",
      label: "Recovery optimization",
      pillars: ["exercise", "sleep"]
    });
  }
  
  // Nutrition + Exercise synergy
  if (nutritionPlan && nutritionPlan.adherence_score > 75 && exercisePlan && exercisePlan.adherence_score > 75) {
    insights.push({
      status: "balanced",
      label: "Nutrition + Exercise",
      pillars: ["nutrition", "exercise"]
    });
  }
  
  // Generate cross-pillar relationships
  const relationships: PillarSynergy[] = [];
  
  if (hydrationPlan && sleepPlan && hydrationPlan.adherence_score > 70) {
    relationships.push({
      from: "hydration",
      to: "sleep",
      impact: "Hydration consistency boosted sleep recovery +4%",
      type: "positive",
      icons: { from: "💧", to: "🌙" }
    });
  }
  
  if (mentalPlan && nutritionPlan && mentalPlan.adherence_score > 75) {
    relationships.push({
      from: "mental",
      to: "nutrition",
      impact: "Improved mental calm reduced overeating spikes -6%",
      type: "positive",
      icons: { from: "🧘‍♀️", to: "🍏" }
    });
  }
  
  if (exercisePlan && sleepPlan && exercisePlan.adherence_score > 70) {
    relationships.push({
      from: "exercise",
      to: "sleep",
      impact: "Exercise timing optimized for better sleep quality",
      type: "positive",
      icons: { from: "🏋️", to: "🌙" }
    });
  }
  
  // Sleep → Mental
  if (sleepPlan && sleepPlan.adherence_score > 80 && mentalPlan && mentalPlan.adherence_score > 70) {
    relationships.push({
      from: "sleep",
      to: "mental",
      impact: "Better sleep enhanced mental focus +8%",
      type: "positive",
      icons: { from: "🌙", to: "🧘‍♀️" }
    });
  }
  
  // Supplement → Hydration
  if (supplementPlan && supplementPlan.adherence_score > 85 && hydrationPlan && hydrationPlan.adherence_score > 70) {
    relationships.push({
      from: "supplement",
      to: "hydration",
      impact: "Magnesium AM dose boosted hydration absorption +4%",
      type: "positive",
      icons: { from: "⚗️", to: "💧" }
    });
  }
  
  if (nutritionPlan && nutritionPlan.adherence_score < 70) {
    relationships.push({
      from: "nutrition",
      to: "nutrition",
      impact: "Lack of protein diversity impacted energy balance",
      type: "negative",
      icons: { from: "⚠️", to: "🍏" }
    });
  }
  
  // Use fixed vitana score for consistent demo
  const vitanaScore = 742;
  
  return {
    synergyScore: 84,
    synergyTrend: 3,
    insights,
    relationships,
    lastRecalibration: "3h ago",
    nextRecalibration: "2h 47min",
    lastAdjustment: "Sleep -15min for recovery",
    vitanaScore
  };
}
