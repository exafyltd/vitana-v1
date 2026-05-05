import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Calendar, Clock, AlertTriangle, Target } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CommissionForecast {
  id: string;
  source: string;
  currentMonth: number;
  predicted: number;
  confidence: number;
  trend: "increasing" | "stable" | "decreasing";
  nextPayout: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface OptimalTiming {
  id: string;
  action: string;
  timing: string;
  reason: string;
  impact: number;
  urgency: "high" | "medium" | "low";
}

interface CommissionForecastingCardProps {
  className?: string;
}

const mockForecasts: CommissionForecast[] = [
  {
    id: "1",
    source: "Referral Network",
    currentMonth: 450,
    predicted: 580,
    confidence: 89,
    trend: "increasing",
    nextPayout: "March 15",
    tier: "gold"
  },
  {
    id: "2",
    source: "Community Building",
    currentMonth: 320,
    predicted: 385,
    confidence: 82,
    trend: "increasing",
    nextPayout: "March 20",
    tier: "silver"
  },
  {
    id: "3",
    source: "Service Partnerships",
    currentMonth: 180,
    predicted: 165,
    confidence: 74,
    trend: "decreasing",
    nextPayout: "March 25",
    tier: "bronze"
  }
];

const mockTimingRecommendations: OptimalTiming[] = [
  {
    id: "1",
    action: "Withdraw Pending Commissions",
    timing: "Wait 5 days",
    reason: "VTNA conversion rates expected to improve 12%",
    impact: 85,
    urgency: "medium"
  },
  {
    id: "2",
    action: "Reinvest in Premium Services",
    timing: "Next 48 hours",
    reason: "Early bird pricing ending soon",
    impact: 120,
    urgency: "high"
  }
];

const getTrendConfig = (trend: CommissionForecast["trend"]) => {
  switch (trend) {
    case "increasing":
      return {
        color: "text-emerald-600",
        icon: TrendingUp,
        bgColor: "bg-emerald-500/10"
      };
    case "stable":
      return {
        color: "text-blue-600",
        icon: DollarSign,
        bgColor: "bg-blue-500/10"
      };
    case "decreasing":
      return {
        color: "text-red-600",
        icon: AlertTriangle,
        bgColor: "bg-red-500/10"
      };
  }
};

const getTierColor = (tier: CommissionForecast["tier"]) => {
  switch (tier) {
    case "platinum": return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "gold": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
    case "silver": return "bg-gray-500/10 text-gray-600 border-gray-200";
    case "bronze": return "bg-orange-500/10 text-orange-600 border-orange-200";
  }
};

const getUrgencyColor = (urgency: OptimalTiming["urgency"]) => {
  switch (urgency) {
    case "high": return "bg-red-500/10 text-red-600 border-red-200";
    case "medium": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "low": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
  }
};

export function CommissionForecastingCard({ className }: CommissionForecastingCardProps) {
  const totalCurrent = mockForecasts.reduce((sum, f) => sum + f.currentMonth, 0);
  const totalPredicted = mockForecasts.reduce((sum, f) => sum + f.predicted, 0);
  const averageConfidence = Math.round(
    mockForecasts.reduce((sum, f) => sum + f.confidence, 0) / mockForecasts.length
  );
  const projectedGrowth = Math.round(((totalPredicted - totalCurrent) / totalCurrent) * 100);

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('screens.wallet.commissionForecasting')}
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            +{projectedGrowth}% Growth
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Forecast Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-blue-500/5 border border-primary/20">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">${totalCurrent}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.current')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">${totalPredicted}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.predicted')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{averageConfidence}%</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.confidence')}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('screens.wallet.projected')} <span className="font-semibold text-emerald-600">${totalPredicted - totalCurrent} increase</span> this month
          </p>
        </div>

        {/* Commission Sources */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" />
            {t('screens.wallet.revenueStreams')}
          </h4>
          
          {mockForecasts.slice(0, 2).map((forecast) => {
            const trendConfig = getTrendConfig(forecast.trend);
            const TrendIcon = trendConfig.icon;
            
            return (
              <div key={forecast.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium flex items-center gap-2">
                      {forecast.source}
                      <TrendIcon className={`h-3 w-3 ${trendConfig.color}`} />
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      ${forecast.currentMonth} → ${forecast.predicted} predicted
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={getTierColor(forecast.tier)}>
                      {forecast.tier}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {forecast.confidence}% confidence
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Payout: {forecast.nextPayout}
                  </div>
                  <div className={`text-xs font-semibold ${trendConfig.color}`}>
                    {forecast.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optimal Timing Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-500" />
            {t('screens.wallet.optimalTiming')}
          </h4>
          
          {mockTimingRecommendations.map((timing) => (
            <div key={timing.id} className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-200/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-medium">{timing.action}</h5>
                  <p className="text-xs text-muted-foreground">{timing.reason}</p>
                </div>
                <Badge variant="outline" className={getUrgencyColor(timing.urgency)}>
                  {timing.urgency} priority
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-purple-600 font-semibold">
                    +${timing.impact} impact
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {timing.timing}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  {t('screens.wallet.setReminder')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Market Intelligence */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">{t('screens.wallet.marketIntelligence')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('screens.wallet.commissionRates8HigherThanAverage')}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 font-medium">{t('screens.wallet.optimalEarningWindowNext2Weeks')}</span>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2">
              {t('screens.wallet.maximizeNow')}
            </Button>
          </div>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <TrendingUp className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewDetailedForecast')}
        </Button>
      </CardContent>
    </Card>
  );
}