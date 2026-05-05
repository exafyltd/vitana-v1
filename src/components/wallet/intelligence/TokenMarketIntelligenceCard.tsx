import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, BarChart3, Shield, AlertTriangle, Clock } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface MarketInsight {
  id: string;
  title: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
  timeframe: string;
  actionable: boolean;
}

interface StakingOptimization {
  currentAPY: number;
  optimizedAPY: number;
  stakingAmount: number;
  unstakeDate?: string;
  recommendation: string;
}

interface TokenMarketIntelligenceCardProps {
  className?: string;
}

const mockInsights: MarketInsight[] = [
  {
    id: "1",
    title: "Optimal Staking Window",
    description: "APY expected to increase 0.8% in next 48 hours",
    impact: "positive",
    confidence: 87,
    timeframe: "Next 2 days",
    actionable: true
  },
  {
    id: "2",
    title: "Governance Participation Reward",
    description: "Active governance voting adds 1.2% bonus APY",
    impact: "positive",
    confidence: 94,
    timeframe: "Ongoing",
    actionable: true
  },
  {
    id: "3",
    title: "Market Sentiment Analysis",
    description: "VTN showing strong accumulation patterns",
    impact: "positive",
    confidence: 78,
    timeframe: "This week",
    actionable: false
  }
];

const stakingData: StakingOptimization = {
  currentAPY: 5.2,
  optimizedAPY: 6.8,
  stakingAmount: 800,
  unstakeDate: "2024-03-15",
  recommendation: "Consider increasing stake by 200 VTN for optimal rewards"
};

const getImpactConfig = (impact: MarketInsight["impact"]) => {
  switch (impact) {
    case "positive":
      return {
        icon: TrendingUp,
        color: "text-emerald-600",
        badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-200"
      };
    case "negative":
      return {
        icon: TrendingDown,
        color: "text-red-600",
        badgeColor: "bg-red-500/10 text-red-600 border-red-200"
      };
    case "neutral":
      return {
        icon: BarChart3,
        color: "text-blue-600",
        badgeColor: "bg-blue-500/10 text-blue-600 border-blue-200"
      };
  }
};

export function TokenMarketIntelligenceCard({ className }: TokenMarketIntelligenceCardProps) {
  const potentialIncrease = (stakingData.optimizedAPY - stakingData.currentAPY).toFixed(1);

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('screens.wallet.tokenIntelligence')}
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            +{potentialIncrease}% APY Available
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Staking Optimization */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">{t('screens.wallet.stakingOptimization')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.currentApy')}</div>
              <div className="text-lg font-bold text-blue-600">{stakingData.currentAPY}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.optimizedApy')}</div>
              <div className="text-lg font-bold text-emerald-600">{stakingData.optimizedAPY}%</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stakingData.recommendation}
          </p>
        </div>

        {/* Market Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            {t('screens.wallet.marketInsights')}
          </h4>
          
          {mockInsights.slice(0, 2).map((insight) => {
            const config = getImpactConfig(insight.impact);
            const IconComponent = config.icon;
            
            return (
              <div key={insight.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${config.color}`} />
                    <div>
                      <h5 className="text-sm font-medium">{insight.title}</h5>
                      <p className="text-xs text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-xs mb-1 ${config.badgeColor}`}>
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {insight.timeframe}
                  </div>
                  {insight.actionable && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600">
                      Actionable
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Governance Participation */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">{t('screens.wallet.governanceAlert')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('screens.wallet.newProposalAvailableCommunityFundAllocation')}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 font-medium">{t('screens.wallet.bonusApy12')}</span>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2">
              {t('screens.wallet.voteNow')}
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline">
            <Shield className="h-3 w-3 mr-1" />
            {t('screens.wallet.optimizeStake')}
          </Button>
          <Button size="sm" variant="outline">
            <BarChart3 className="h-3 w-3 mr-1" />
            {t('screens.wallet.viewAnalysis')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}