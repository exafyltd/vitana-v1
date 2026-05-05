import React from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, Target, TrendingUp, Globe, Layers } from "lucide-react";
import { EarningStreaksAnalyticsCard } from "./EarningStreaksAnalyticsCard";
import { CommissionForecastingCard } from "./CommissionForecastingCard";
import { SocialEarningIntelligenceCard } from "./SocialEarningIntelligenceCard";
import { t } from '@/lib/i18n-toast';

interface CrossPlatformOpportunity {
  id: string;
  platform: string;
  opportunity: string;
  potential: number;
  effort: number;
  timeframe: string;
  category: "health" | "community" | "data" | "social";
  synergy: number;
}

interface IntelligenceInsight {
  id: string;
  title: string;
  description: string;
  impact: number;
  confidence: number;
  actionable: boolean;
  platforms: string[];
}

interface EarningIntelligenceSplitScreenProps {
  className?: string;
}

const mockCrossPlatformOpportunities: CrossPlatformOpportunity[] = [
  {
    id: "1",
    platform: "Health + Community",
    opportunity: "Lead wellness challenges while sharing health data",
    potential: 285,
    effort: 60,
    timeframe: "2 weeks",
    category: "health",
    synergy: 92
  },
  {
    id: "2",
    platform: "Community + Data",
    opportunity: "Community insights powered by aggregated data sharing",
    potential: 340,
    effort: 75,
    timeframe: "1 month",
    category: "data",
    synergy: 87
  },
  {
    id: "3",
    platform: "Social + Health",
    opportunity: "Peer health coaching with social proof",
    potential: 220,
    effort: 45,
    timeframe: "3 weeks",
    category: "social",
    synergy: 78
  }
];

const mockIntelligenceInsights: IntelligenceInsight[] = [
  {
    id: "1",
    title: "Cross-Platform Multiplier Effect",
    description: "Users active on 3+ platforms earn 240% more on average",
    impact: 240,
    confidence: 94,
    actionable: true,
    platforms: ["Health", "Community", "Data"]
  },
  {
    id: "2",
    title: "Timing Optimization Pattern",
    description: "Morning health data + evening community engagement = 85% bonus",
    impact: 85,
    confidence: 88,
    actionable: true,
    platforms: ["Health", "Community"]
  },
  {
    id: "3",
    title: "Network Effect Amplification",
    description: "Social referrals from health achievements have 3x conversion",
    impact: 300,
    confidence: 91,
    actionable: true,
    platforms: ["Social", "Health"]
  }
];

const getCategoryColor = (category: CrossPlatformOpportunity["category"]) => {
  switch (category) {
    case "health": return "border-l-emerald-500";
    case "community": return "border-l-blue-500";
    case "data": return "border-l-purple-500";
    case "social": return "border-l-pink-500";
  }
};

const getCategoryIcon = (category: CrossPlatformOpportunity["category"]) => {
  switch (category) {
    case "health": return "🏥";
    case "community": return "👥";
    case "data": return "📊";
    case "social": return "🤝";
  }
};

export function EarningIntelligenceSplitScreen({ className }: EarningIntelligenceSplitScreenProps) {
  const totalCrossPlatformPotential = mockCrossPlatformOpportunities.reduce((sum, opp) => sum + opp.potential, 0);
  const avgSynergy = Math.round(
    mockCrossPlatformOpportunities.reduce((sum, opp) => sum + opp.synergy, 0) / mockCrossPlatformOpportunities.length
  );
  const avgConfidence = Math.round(
    mockIntelligenceInsights.reduce((sum, insight) => sum + insight.confidence, 0) / mockIntelligenceInsights.length
  );

  const leftPanel = (
    <div className="space-y-6">
      {/* Intelligence Cards */}
      <div className="grid grid-cols-1 gap-4">
        <EarningStreaksAnalyticsCard />
        <CommissionForecastingCard />
        <SocialEarningIntelligenceCard />
      </div>
    </div>
  );

  const rightPanel = (
    <div className="space-y-6">
      {/* Cross-Platform Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t('screens.wallet.crossplatformIntelligence')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intelligence Summary */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20">
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{totalCrossPlatformPotential}</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.vtnPotential')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{avgSynergy}%</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.avgSynergy')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{avgConfidence}%</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.confidence')}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-semibold text-primary">{t('screens.wallet.crossplatformStrategies')}</span> unlock highest earning potential
            </p>
          </div>

          {/* Cross-Platform Opportunities */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-500" />
              {t('screens.wallet.platformSynergies')}
            </h4>
            
            {mockCrossPlatformOpportunities.map((opportunity) => (
              <div 
                key={opportunity.id} 
                className={`p-3 rounded-lg border-l-4 bg-card/50 hover:bg-card/80 transition-colors ${getCategoryColor(opportunity.category)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(opportunity.category)}</span>
                    <div>
                      <h5 className="text-sm font-medium">{opportunity.platform}</h5>
                      <p className="text-xs text-muted-foreground">{opportunity.opportunity}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
                    {opportunity.synergy}% synergy
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{t('screens.wallet.effort')}</span>
                      <span className="text-xs text-muted-foreground">{opportunity.effort}%</span>
                    </div>
                    <Progress value={opportunity.effort} className="h-1.5" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-emerald-600">+{opportunity.potential} VTN</div>
                    <div className="text-xs text-muted-foreground">{opportunity.timeframe}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Intelligence Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t('screens.wallet.aiIntelligenceInsights')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intelligence Insights */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              {t('screens.wallet.strategicInsights')}
            </h4>
            
            {mockIntelligenceInsights.map((insight) => (
              <div key={insight.id} className="p-3 rounded-lg border bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium">{insight.title}</h5>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                    {insight.confidence}% confidence
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-1">
                    {insight.platforms.map((platform, index) => (
                      <Badge key={index} variant="outline" className="text-xs h-4 px-1">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">
                    +{insight.impact}% impact
                  </div>
                </div>

                {insight.actionable && (
                  <Button size="sm" variant="outline" className="text-xs h-6 px-2 w-full">
                    Apply Strategy
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Master Strategy */}
          <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{t('screens.wallet.masterStrategy')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('screens.wallet.combineAllThreeInsightsForPotential')}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-600 font-medium">{t('screens.wallet.estimatedMonthlyImpact2400')}</span>
              <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                <Zap className="h-3 w-3 mr-1" />
                {t('screens.wallet.activateAll')}
              </Button>
            </div>
          </div>

          {/* Performance Tracking */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm font-medium mb-2">{t('screens.wallet.intelligencePerformance')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">87%</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.predictionAccuracy')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">+340%</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.avgUserImprovement')}</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            {t('screens.wallet.optimizeAllEarnings')}
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