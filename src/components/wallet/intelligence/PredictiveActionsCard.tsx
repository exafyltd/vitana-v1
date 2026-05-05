import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { Sparkles, ArrowRight, Clock, Target, TrendingUp } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface PredictiveAction {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "monetize" | "optimize" | "invest" | "cashout";
  confidence: number;
  expectedReturn: number;
  timeframe: string;
  reasoning: string;
}

interface PredictiveActionsCardProps {
  className?: string;
}

const mockActions: PredictiveAction[] = [
  {
    id: "1",
    title: "Monetize Health Improvement",
    description: "Your health score increased 12% - time to share improvement data",
    priority: "high",
    category: "monetize",
    confidence: 94,
    expectedReturn: 150,
    timeframe: "Next 24 hours",
    reasoning: "Health data value peaks immediately after improvements"
  },
  {
    id: "2",
    title: "Optimal Cash-Out Window",
    description: "Market conditions favor VTN conversion in 2-3 days",
    priority: "medium",
    category: "cashout",
    confidence: 87,
    expectedReturn: 75,
    timeframe: "2-3 days",
    reasoning: "Historical patterns show 15% better rates mid-week"
  },
  {
    id: "3",
    title: "Stake for Community Event",
    description: "Upcoming wellness challenge offers 2x staking rewards",
    priority: "high",
    category: "invest",
    confidence: 91,
    expectedReturn: 200,
    timeframe: "Next 48 hours",
    reasoning: "Limited-time event with high participation expected"
  }
];

const getPriorityConfig = (priority: PredictiveAction["priority"]) => {
  switch (priority) {
    case "high":
      return {
        color: "bg-red-500/10 text-red-600 border-red-200",
        dot: "bg-red-500"
      };
    case "medium":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200", 
        dot: "bg-amber-500"
      };
    case "low":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        dot: "bg-emerald-500"
      };
  }
};

const getCategoryIcon = (category: PredictiveAction["category"]) => {
  switch (category) {
    case "monetize": return "💎";
    case "optimize": return "⚡";
    case "invest": return "📈";
    case "cashout": return "💰";
  }
};

const getCategoryColor = (category: PredictiveAction["category"]) => {
  switch (category) {
    case "monetize": return "text-purple-600";
    case "optimize": return "text-blue-600";
    case "invest": return "text-emerald-600";
    case "cashout": return "text-amber-600";
  }
};

export function PredictiveActionsCard({ className }: PredictiveActionsCardProps) {
  const highPriorityActions = mockActions.filter(action => action.priority === "high");
  const avgConfidence = mockActions.reduce((sum, action) => sum + action.confidence, 0) / mockActions.length;

  return (
    <Card className={`${className} relative`}>
      <RewardDot 
        points={12} 
        description="Act on AI predictions for maximum rewards"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('screens.wallet.aiPredictions')}
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">{t('screens.wallet.value0Confidence', { value0: avgConfidence.toFixed(0) })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Priority Actions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-red-500" />{t('screens.wallet.highPriorityActionsLength', { length: highPriorityActions.length })}
          </h4>
          
          {highPriorityActions.map((action) => {
            const priorityConfig = getPriorityConfig(action.priority);
            
            return (
              <div key={action.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors cursor-pointer group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(action.category)}</span>
                    <div>
                      <h5 className="text-sm font-medium group-hover:text-primary transition-colors">
                        {action.title}
                      </h5>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityConfig.color}>
                      <div className={`w-2 h-2 rounded-full ${priorityConfig.dot} mr-1`} />{t('screens.wallet.priorityPriority', { priority: action.priority })}
                    </Badge>
                    <Badge variant="secondary" className={`text-xs ${getCategoryColor(action.category)}`}>{t('screens.wallet.expectedreturnVtn', { expectedReturn: action.expectedReturn })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {action.timeframe}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                  <span className="font-medium">{t('screens.wallet.aiReasoning')}</span> {action.reasoning}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confidence Indicator */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('screens.wallet.predictionAccuracy')}
            </span>
            <span className="text-sm text-primary font-semibold">{avgConfidence.toFixed(0)}%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('screens.wallet.basedYourBehaviorPatternsMarketAnalysis')}
          </p>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="default">
          <Sparkles className="h-4 w-4 mr-2" />
          {t('screens.wallet.actTopRecommendation')}
        </Button>
      </CardContent>
    </Card>
  );
}