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
  Calendar
} from "lucide-react";
import { useHealthPlans } from "@/hooks/useHealthPlans";

const PLAN_ICONS: Record<string, any> = {
  nutrition: Apple,
  exercise: Dumbbell,
  hydration: Droplet,
  sleep: Moon,
  mental: Brain,
  supplement: Plus
};

const PLAN_COLORS: Record<string, string> = {
  nutrition: "text-green-600 bg-green-50",
  exercise: "text-blue-600 bg-blue-50",
  hydration: "text-cyan-600 bg-cyan-50",
  sleep: "text-purple-600 bg-purple-50",
  mental: "text-pink-600 bg-pink-50",
  supplement: "text-orange-600 bg-orange-50"
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
      <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className={`p-4 rounded-full ${colorClass}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg capitalize mb-2">{type} Plan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No plan generated yet
            </p>
            <Button 
              onClick={handleGenerate}
              disabled={generatePlan.isPending}
            >
              {generatePlan.isPending ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }
  
  const planData = plan.plan_data as any;
  
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{planData.planName || `${type} Plan`}</h3>
            <p className="text-sm text-muted-foreground">{planData.duration || 'Ongoing'}</p>
          </div>
        </div>
        {plan.ai_generated && (
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            AI Generated
          </Badge>
        )}
      </div>
      
      {/* Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Adherence</span>
          <span className="text-sm font-bold">{plan.adherence_score}%</span>
        </div>
        <Progress value={plan.adherence_score} className="h-2" />
      </div>
      
      {/* Goals Section */}
      {planData.goals && planData.goals.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Goals</h4>
          <ul className="space-y-1">
            {planData.goals.slice(0, detailed ? undefined : 3).map((goal: string, idx: number) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" className="flex-1">
          <Calendar className="h-4 w-4 mr-2" />
          Log Today
        </Button>
        <Button variant="default" size="sm" className="flex-1">
          View Details
        </Button>
      </div>
      
      {detailed && planData.recommendations && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Key Recommendations</h4>
          <ul className="space-y-2">
            {planData.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-sm text-muted-foreground">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
