import React from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Zap, Brain, Target, Calendar, DollarSign } from "lucide-react";
import { SmartEarningsForecastCard } from "./SmartEarningsForecastCard";
import { IntelligentSpendingCard } from "./IntelligentSpendingCard";
import { DynamicRewardOpportunityCard } from "./DynamicRewardOpportunityCard";
import { t } from '@/lib/i18n-toast';

interface OptimizationStrategy {
  id: string;
  title: string;
  description: string;
  impact: number;
  effort: "low" | "medium" | "high";
  timeframe: string;
  category: "immediate" | "short-term" | "long-term";
  implemented: boolean;
}

interface EarningOptimizationSplitScreenProps {
  className?: string;
}

const mockStrategies: OptimizationStrategy[] = [
  {
    id: "1",
    title: "Morning Data Sharing Routine",
    description: "Share biomarkers within 2 hours of waking for 25% bonus",
    impact: 85,
    effort: "low",
    timeframe: "Immediate",
    category: "immediate",
    implemented: false
  },
  {
    id: "2",
    title: "Cross-Platform Engagement",
    description: "Participate in community + health tracking daily",
    impact: 120,
    effort: "medium",
    timeframe: "This week",
    category: "short-term",
    implemented: true
  },
  {
    id: "3",
    title: "Predictive Wellness Actions",
    description: "Use AI recommendations for optimal timing",
    impact: 200,
    effort: "low",
    timeframe: "Next month",
    category: "long-term",
    implemented: false
  }
];

const getEffortColor = (effort: OptimizationStrategy["effort"]) => {
  switch (effort) {
    case "low": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "medium": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "high": return "bg-red-500/10 text-red-600 border-red-200";
  }
};

const getCategoryColor = (category: OptimizationStrategy["category"]) => {
  switch (category) {
    case "immediate": return "border-l-red-500";
    case "short-term": return "border-l-amber-500";
    case "long-term": return "border-l-emerald-500";
  }
};

export function EarningOptimizationSplitScreen({ className }: EarningOptimizationSplitScreenProps) {
  const totalImpact = mockStrategies.reduce((sum, strategy) => sum + strategy.impact, 0);
  const implementedStrategies = mockStrategies.filter(s => s.implemented).length;
  const implementationProgress = (implementedStrategies / mockStrategies.length) * 100;

  const leftPanel = (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4">
        <SmartEarningsForecastCard />
        <IntelligentSpendingCard />
        <DynamicRewardOpportunityCard />
      </div>
    </div>
  );

  const rightPanel = (
    <div className="space-y-6">
      {/* Optimization Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t('screens.wallet.earningOptimizationDashboard')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strategy Implementation Progress */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('screens.wallet.strategyImplementation')}</span>
              <span className="text-sm text-muted-foreground">
                {implementedStrategies}/{mockStrategies.length} complete
              </span>
            </div>
            <Progress value={implementationProgress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{t('screens.wallet.totalimpactVtn', { totalImpact })}</span> potential monthly increase
            </p>
          </div>

          {/* Optimization Strategies */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              {t('screens.wallet.recommendedStrategies')}
            </h4>
            
            {mockStrategies.map((strategy) => (
              <div 
                key={strategy.id} 
                className={`p-3 rounded-lg border-l-4 bg-card/50 hover:bg-card/80 transition-colors ${getCategoryColor(strategy.category)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium flex items-center gap-2">
                      {strategy.title}
                      {strategy.implemented && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600">
                          {t('screens.wallet.active')}
                        </Badge>
                      )}
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      {strategy.description}
                    </p>
                  </div>
                  <Badge variant="outline" className={getEffortColor(strategy.effort)}>
                    {strategy.effort} effort
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-emerald-600">
                      <DollarSign className="h-3 w-3" />
                      +{strategy.impact} VTN/month
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {strategy.timeframe}
                    </div>
                  </div>
                  {!strategy.implemented && (
                    <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                      Implement
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-primary">{totalImpact}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.vtnPotential')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-emerald-600">{implementedStrategies}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.active')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-amber-600">{Math.round(implementationProgress)}%</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.complete')}</div>
            </div>
          </div>

          {/* Action Button */}
          <Button className="w-full">
            <Zap className="h-4 w-4 mr-2" />
            {t('screens.wallet.activateAllOptimizations')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <SplitScreen
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      className={className}
    />
  );
}