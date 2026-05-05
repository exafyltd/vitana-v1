import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RewardDot } from "@/components/ui/reward-dot";
import { Brain, AlertTriangle, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SpendingInsight {
  id: string;
  title: string;
  description: string;
  impact: "positive" | "neutral" | "warning";
  category: "timing" | "pattern" | "optimization" | "budget";
  actionable: boolean;
  savings?: number;
}

interface IntelligentSpendingCardProps {
  className?: string;
}

const mockInsights: SpendingInsight[] = [
  {
    id: "1",
    title: "Optimal Purchase Timing",
    description: "Wait 3 days for 15% better VTNA conversion rates",
    impact: "positive",
    category: "timing",
    actionable: true,
    savings: 25
  },
  {
    id: "2",
    title: "Stress-Related Spending Pattern",
    description: "You spend 40% more on wellness services during high-stress periods",
    impact: "warning",
    category: "pattern",
    actionable: true,
    savings: 60
  },
  {
    id: "3",
    title: "Subscription Optimization",
    description: "Consider upgrading to premium for better ROI based on your usage",
    impact: "positive",
    category: "optimization",
    actionable: true,
    savings: 120
  }
];

const getImpactConfig = (impact: SpendingInsight["impact"]) => {
  switch (impact) {
    case "positive":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        icon: TrendingDown,
        label: "Savings"
      };
    case "warning":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        icon: AlertTriangle,
        label: "Alert"
      };
    case "neutral":
      return {
        color: "bg-muted/50 text-muted-foreground border-border",
        icon: Brain,
        label: "Insight"
      };
  }
};

const getCategoryIcon = (category: SpendingInsight["category"]) => {
  switch (category) {
    case "timing": return "⏰";
    case "pattern": return "🔄";
    case "optimization": return "⚡";
    case "budget": return "💰";
  }
};

export function IntelligentSpendingCard({ className }: IntelligentSpendingCardProps) {
  const totalSavings = mockInsights.reduce((sum, insight) => sum + (insight.savings || 0), 0);
  const spendingEfficiency = 78; // Mock efficiency score
  
  return (
    <Card className={`${className} relative`}>
      <RewardDot 
        points={6} 
        description="Apply spending insights for savings rewards"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Spending Intelligence
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            {totalSavings} VTNA Savings Available
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Efficiency Score */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('screens.wallet.spendingEfficiency')}</span>
            <span className="text-sm text-muted-foreground">{spendingEfficiency}%</span>
          </div>
          <Progress value={spendingEfficiency} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-600">{t('screens.wallet.text22Improvement')}</span> from last month
          </p>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Smart Insights
          </h4>
          
          {mockInsights.slice(0, 2).map((insight) => {
            const config = getImpactConfig(insight.impact);
            const IconComponent = config.icon;
            
            return (
              <div key={insight.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(insight.category)}</span>
                    <div>
                      <h5 className="text-sm font-medium">{insight.title}</h5>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={config.color}>
                    <IconComponent className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  {insight.savings && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <DollarSign className="h-3 w-3" />
                      Save {insight.savings} VTNA
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Market Timing */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">{t('screens.wallet.marketTimingAlert')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            VTNA conversion rates are expected to increase by 12% in the next 48 hours
          </p>
          <Button size="sm" variant="outline" className="text-xs h-7">
            Set Reminder
          </Button>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Brain className="h-4 w-4 mr-2" />
          View Detailed Analysis
        </Button>
      </CardContent>
    </Card>
  );
}