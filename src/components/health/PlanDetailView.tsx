import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, Target, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface PlanDetailViewProps {
  plan: any;
}

export function PlanDetailView({ plan }: PlanDetailViewProps) {
  if (!plan) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('screens.health.selectPlanViewDetails')}</p>
      </div>
    );
  }
  
  const planData = plan.plan_data;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{planData.planName}</h2>
            <p className="text-muted-foreground">{planData.duration}</p>
          </div>
          {plan.ai_generated && (
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" />{t('screens.health.aiGenerated')}
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('screens.health.overallProgress')}</span>
              <span className="text-sm font-bold">{plan.adherence_score}%</span>
            </div>
            <Progress value={plan.adherence_score} className="h-2" />
          </div>
          
          <div className="flex gap-2">
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              {t('screens.health.logProgress')}
            </Button>
            <Button variant="outline" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('screens.health.viewAnalytics')}
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Goals */}
      {planData.goals && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('screens.health.goals')}
          </h3>
          <ul className="space-y-2">
            {planData.goals.map((goal: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>{goal}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      
      {/* Daily Plan */}
      {planData.dailyPlan && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">{t('screens.health.dailyPlan')}</h3>
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(planData.dailyPlan, null, 2)}
          </pre>
        </Card>
      )}
      
      {/* Weekly Plan */}
      {planData.weeklyPlan && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">{t('screens.health.weeklyPlan')}</h3>
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(planData.weeklyPlan, null, 2)}
          </pre>
        </Card>
      )}
      
      {/* Recommendations */}
      {planData.recommendations && (
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">{t('screens.health.keyRecommendations')}</h3>
          <ul className="space-y-3">
            {planData.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
