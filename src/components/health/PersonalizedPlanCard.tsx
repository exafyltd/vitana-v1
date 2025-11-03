import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Apple, 
  Dumbbell, 
  Droplet, 
  Moon, 
  Brain, 
  Plus,
  TrendingUp,
  Calendar,
  Sparkles
} from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<string, any> = {
  nutrition: Apple,
  exercise: Dumbbell,
  hydration: Droplet,
  sleep: Moon,
  mental: Brain,
  supplement: Plus
};

const PLAN_COLORS: Record<string, string> = {
  nutrition: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30",
  exercise: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30",
  hydration: "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/30",
  sleep: "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30",
  mental: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30",
  supplement: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
};

const PLAN_GLOWS: Record<string, string> = {
  nutrition: "shadow-emerald-200/50 dark:shadow-emerald-900/30",
  exercise: "shadow-blue-200/50 dark:shadow-blue-900/30",
  hydration: "shadow-cyan-200/50 dark:shadow-cyan-900/30",
  sleep: "shadow-indigo-200/50 dark:shadow-indigo-900/30",
  mental: "shadow-rose-200/50 dark:shadow-rose-900/30",
  supplement: "shadow-amber-200/50 dark:shadow-amber-900/30"
};

const PLAN_DOT_COLORS: Record<string, string> = {
  nutrition: "bg-emerald-500",
  exercise: "bg-blue-500",
  hydration: "bg-cyan-500",
  sleep: "bg-indigo-500",
  mental: "bg-rose-500",
  supplement: "bg-amber-500"
};

const PLAN_INSIGHTS: Record<string, string> = {
  nutrition: "5 meals / day · Avg 2100 kcal · Balanced macros",
  exercise: "4 sessions / week · Strength & Mobility",
  hydration: "8 glasses / day · 72% consistency",
  sleep: "7.5h avg · 86% sleep score",
  mental: "10 min reflection · 9-day streak",
  supplement: "3 supplements tracked · On schedule"
};

interface PersonalizedPlanCardProps {
  type: 'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'mental' | 'supplement';
  detailed?: boolean;
}

export function PersonalizedPlanCard({ type, detailed = false }: PersonalizedPlanCardProps) {
  const { plans, generatePlan } = useHealthPlans();
  
  const plan = plans?.find(p => p.plan_type === type);
  const Icon = PLAN_ICONS[type];
  const colorClass = PLAN_COLORS[type];
  
  const handleGenerate = () => {
    generatePlan.mutate({
      planType: type,
      userContext: {
        vitanaScore: 75,
        weakestPillar: type
      }
    });
  };
  
  if (!plan) {
    return (
      <Card className="h-[250px] rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] relative overflow-hidden">
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5">
            Not Generated ❌
          </Badge>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-4 h-full p-6">
          <div className={cn(
            "p-4 rounded-full relative",
            colorClass,
            PLAN_GLOWS[type]
          )}>
            <Icon className="h-8 w-8" />
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-lg capitalize mb-1 text-slate-900 dark:text-slate-100">
              {type} Plan
            </h3>
            
            {/* Dynamic Mini-Insight (grayed out when not generated) */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-1 mb-3 font-medium">
              <span className={cn("w-1.5 h-1.5 rounded-full", PLAN_DOT_COLORS[type])} />
              <span>{PLAN_INSIGHTS[type]}</span>
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              No plan generated yet
            </p>
            
            <Button 
              onClick={handleGenerate}
              disabled={generatePlan.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm font-semibold px-4 py-2"
            >
              {generatePlan.isPending ? 'Generating...' : '⚡ Generate Plan'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  
  const planData = plan.plan_data as any;
  
  return (
    <Card className="h-[250px] rounded-2xl bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] relative overflow-hidden group">
      {/* AI Optimized Indicator */}
      <div className="absolute top-3 right-3">
        <Badge variant="secondary" className="bg-slate-100/60 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 px-2 py-0.5">
          {plan.ai_generated ? 'AI Optimized ✅' : 'Manual 📝'}
        </Badge>
      </div>
      
      <div className="p-6 flex flex-col h-full">
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "p-3 rounded-lg relative",
            colorClass,
            PLAN_GLOWS[type],
            plan.ai_generated && "animate-pulse-glow"
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              {planData.planName || `${type.charAt(0).toUpperCase() + type.slice(1)} Plan`}
            </h3>
            
            {/* Dynamic Mini-Insight */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              <span className={cn("w-1.5 h-1.5 rounded-full", PLAN_DOT_COLORS[type])} />
              <span>{PLAN_INSIGHTS[type]}</span>
            </div>
          </div>
        </div>
        
        {/* Progress Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Adherence</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.adherence_score}%</span>
          </div>
          <Progress value={plan.adherence_score} className="h-2" />
        </div>
        
        {/* Goals Preview (compact) */}
        {planData.goals && planData.goals.length > 0 && (
          <div className="mb-4 flex-1">
            <ul className="space-y-1">
              {planData.goals.slice(0, 2).map((goal: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5 truncate">
                  <span className={cn("w-1 h-1 rounded-full mt-1.5 flex-shrink-0", PLAN_DOT_COLORS[type])} />
                  <span className="truncate">{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex gap-2 mt-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
          >
            🔍 View Plan
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 text-xs bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
          >
            ↻ Recalibrate
          </Button>
        </div>
      </div>
    </Card>
  );
}
