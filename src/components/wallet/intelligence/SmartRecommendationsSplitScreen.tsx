import React from "react";
import { SplitScreen } from "@/components/ui/split-screen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Clock, Users, Target, Zap } from "lucide-react";
import { PersonalizedSubscriptionRecommendationCard } from "./PersonalizedSubscriptionRecommendationCard";
import { SubscriptionROIAnalyticsCard } from "./SubscriptionROIAnalyticsCard";
import { t } from '@/lib/i18n-toast';

interface TimingIntelligence {
  id: string;
  service: string;
  currentPrice: number;
  predictedPrice: number;
  bestTime: string;
  confidence: number;
  savings: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface CommunityTrend {
  id: string;
  service: string;
  adoptionRate: number;
  satisfaction: number;
  popularityTrend: "rising" | "falling" | "stable";
  userCount: number;
  category: string;
}

interface SmartRecommendationsSplitScreenProps {
  className?: string;
}

const mockTimingIntelligence: TimingIntelligence[] = [
  {
    id: "1",
    service: "Premium Health Analytics",
    currentPrice: 149,
    predictedPrice: 179,
    bestTime: "Next 5 days",
    confidence: 92,
    savings: 30,
    trend: "increasing"
  },
  {
    id: "2",
    service: "AI Coaching Package",
    currentPrice: 79,
    predictedPrice: 69,
    bestTime: "Wait 2 weeks",
    confidence: 87,
    savings: 10,
    trend: "decreasing"
  },
  {
    id: "3",
    service: "Community Wellness Plus",
    currentPrice: 39,
    predictedPrice: 49,
    bestTime: "Subscribe now",
    confidence: 78,
    savings: 10,
    trend: "increasing"
  }
];

const mockCommunityTrends: CommunityTrend[] = [
  {
    id: "1",
    service: "AI Wellness Coach",
    adoptionRate: 89,
    satisfaction: 4.8,
    popularityTrend: "rising",
    userCount: 2847,
    category: "Coaching"
  },
  {
    id: "2",
    service: "Biomarker Pro",
    adoptionRate: 67,
    satisfaction: 4.6,
    popularityTrend: "stable",
    userCount: 1653,
    category: "Analytics"
  },
  {
    id: "3",
    service: "Group Challenges",
    adoptionRate: 94,
    satisfaction: 4.5,
    popularityTrend: "rising",
    userCount: 5421,
    category: "Community"
  }
];

const getTrendColor = (trend: string) => {
  switch (trend) {
    case "increasing":
    case "rising":
      return "text-red-600";
    case "decreasing":
    case "falling":
      return "text-emerald-600";
    case "stable":
      return "text-blue-600";
    default:
      return "text-muted-foreground";
  }
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "increasing":
    case "rising":
      return "📈";
    case "decreasing":
    case "falling":
      return "📉";
    case "stable":
      return "📊";
    default:
      return "📊";
  }
};

export function SmartRecommendationsSplitScreen({ className }: SmartRecommendationsSplitScreenProps) {
  const totalPotentialSavings = mockTimingIntelligence.reduce((sum, intel) => sum + intel.savings, 0);
  const avgConfidence = Math.round(
    mockTimingIntelligence.reduce((sum, intel) => sum + intel.confidence, 0) / mockTimingIntelligence.length
  );

  const leftPanel = (
    <div className="space-y-6">
      {/* Recommendation Cards */}
      <div className="grid grid-cols-1 gap-4">
        <PersonalizedSubscriptionRecommendationCard />
        <SubscriptionROIAnalyticsCard />
      </div>
    </div>
  );

  const rightPanel = (
    <div className="space-y-6">
      {/* Timing Intelligence Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('screens.wallet.timingIntelligence')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Savings Summary */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-green-500/5 border border-emerald-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('screens.wallet.potentialSavings')}</span>
              <span className="text-sm text-muted-foreground">{t('screens.wallet.avgconfidenceConfidence', { avgConfidence })}</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 mb-1">${totalPotentialSavings}</div>
            <p className="text-xs text-muted-foreground">
              {t('screens.wallet.byTimingYourSubscriptionsOptimally')}
            </p>
          </div>

          {/* Timing Recommendations */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              {t('screens.wallet.pricePredictions')}
            </h4>
            
            {mockTimingIntelligence.map((intel) => (
              <div key={intel.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium">{intel.service}</h5>
                    <p className="text-xs text-muted-foreground">{t('screens.wallet.currentCurrentpricePredictedPredictedprice', { currentPrice: intel.currentPrice, predictedPrice: intel.predictedPrice })}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">{t('screens.wallet.confidenceConfidence', { confidence: intel.confidence })}
                    </Badge>
                    <div className={`text-xs flex items-center gap-1 ${getTrendColor(intel.trend)}`}>
                      {getTrendIcon(intel.trend)} {intel.trend}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-muted-foreground">{t('screens.wallet.bestTime')}</span>
                    <span className="font-semibold ml-1">{intel.bestTime}</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold">{t('screens.wallet.saveSavings', { savings: intel.savings })}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Community Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('screens.wallet.communityTrends')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trending Summary */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-200/50">
            <div className="text-sm font-medium mb-2">{t('screens.wallet.whatSPopular')}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-bold text-blue-600">89%</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.adoptionRate')}</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">4.8</div>
                <div className="text-xs text-muted-foreground">{t('screens.wallet.avgRating')}</div>
              </div>
            </div>
          </div>

          {/* Community Insights */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {t('screens.wallet.trendingServices')}
            </h4>
            
            {mockCommunityTrends.slice(0, 2).map((trend) => (
              <div key={trend.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium">{trend.service}</h5>
                    <p className="text-xs text-muted-foreground">{t('screens.wallet.value0UsersCategory', { value0: trend.userCount.toLocaleString(), category: trend.category })}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${getTrendColor(trend.popularityTrend)}`}>
                    {getTrendIcon(trend.popularityTrend)} {trend.popularityTrend}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{t('screens.wallet.adoption')}</span>
                      <span className="text-xs text-muted-foreground">{trend.adoptionRate}%</span>
                    </div>
                    <Progress value={trend.adoptionRate} className="h-1.5" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{trend.satisfaction}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.wallet.satisfaction')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Community Recommendation */}
          <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{t('screens.wallet.communityInsight')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('screens.wallet.usersSimilarYou3xMoreLikely')}
            </p>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2 w-full">
              <Zap className="h-3 w-3 mr-1" />
              {t('screens.wallet.applyCommunityInsights')}
            </Button>
          </div>
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