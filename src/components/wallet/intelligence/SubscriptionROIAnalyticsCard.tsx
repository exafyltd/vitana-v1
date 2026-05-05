import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, AlertTriangle, Calendar, Target, DollarSign } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SubscriptionMetric {
  id: string;
  name: string;
  cost: number;
  usage: number;
  value: number;
  roi: number;
  trend: "increasing" | "stable" | "decreasing";
  recommendation: string;
  renewalDate: string;
}

interface SubscriptionROIAnalyticsCardProps {
  className?: string;
}

const mockSubscriptions: SubscriptionMetric[] = [
  {
    id: "1",
    name: "Premium Health Coach",
    cost: 99,
    usage: 92,
    value: 450,
    roi: 355,
    trend: "increasing",
    recommendation: "Highly utilized - continue subscription",
    renewalDate: "2024-03-15"
  },
  {
    id: "2",
    name: "Advanced Analytics",
    cost: 49,
    usage: 67,
    value: 180,
    roi: 267,
    trend: "stable",
    recommendation: "Consider increasing usage to maximize value",
    renewalDate: "2024-03-20"
  },
  {
    id: "3",
    name: "Lab Test Coverage",
    cost: 75,
    usage: 45,
    value: 120,
    roi: 60,
    trend: "decreasing",
    recommendation: "Low usage - consider downgrading plan",
    renewalDate: "2024-03-10"
  }
];

const getTrendConfig = (trend: SubscriptionMetric["trend"]) => {
  switch (trend) {
    case "increasing":
      return {
        color: "text-emerald-600",
        bgColor: "bg-emerald-500/10",
        icon: TrendingUp
      };
    case "stable":
      return {
        color: "text-blue-600",
        bgColor: "bg-blue-500/10",
        icon: BarChart3
      };
    case "decreasing":
      return {
        color: "text-red-600",
        bgColor: "bg-red-500/10",
        icon: AlertTriangle
      };
  }
};

const getROIColor = (roi: number) => {
  if (roi >= 300) return "text-emerald-600";
  if (roi >= 200) return "text-blue-600";
  if (roi >= 100) return "text-amber-600";
  return "text-red-600";
};

export function SubscriptionROIAnalyticsCard({ className }: SubscriptionROIAnalyticsCardProps) {
  const totalCost = mockSubscriptions.reduce((sum, sub) => sum + sub.cost, 0);
  const totalValue = mockSubscriptions.reduce((sum, sub) => sum + sub.value, 0);
  const averageROI = Math.round(totalValue / totalCost * 100);
  const averageUsage = Math.round(
    mockSubscriptions.reduce((sum, sub) => sum + sub.usage, 0) / mockSubscriptions.length
  );

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t('screens.wallet.subscriptionRoiAnalytics')}
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            {averageROI}% Avg ROI
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ROI Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">${totalCost}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.monthlyCost')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">${totalValue}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.monthlyValue')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{averageUsage}%</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.avgUsage')}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('screens.wallet.yourSubscriptionsDeliver')} <span className="font-semibold text-emerald-600">${totalValue - totalCost} net value</span> monthly
          </p>
        </div>

        {/* Subscription Performance */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            {t('screens.wallet.performanceAnalysis')}
          </h4>
          
          {mockSubscriptions.slice(0, 2).map((subscription) => {
            const trendConfig = getTrendConfig(subscription.trend);
            const TrendIcon = trendConfig.icon;
            
            return (
              <div key={subscription.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium">{subscription.name}</h5>
                    <p className="text-xs text-muted-foreground">
                      ${subscription.cost}/month • {subscription.usage}% usage
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-xs mb-1 ${getROIColor(subscription.roi)}`}>
                      {subscription.roi}% ROI
                    </Badge>
                    <div className={`flex items-center gap-1 text-xs ${trendConfig.color}`}>
                      <TrendIcon className="h-3 w-3" />
                      {subscription.trend}
                    </div>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{t('screens.wallet.usageRate')}</span>
                    <span className="text-xs text-muted-foreground">{subscription.usage}%</span>
                  </div>
                  <Progress value={subscription.usage} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Renews {subscription.renewalDate}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <DollarSign className="h-3 w-3" />
                    ${subscription.value} value
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Optimization Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('screens.wallet.smartRecommendations')}</h4>
          {mockSubscriptions
            .filter(sub => sub.trend === "decreasing" || sub.usage < 70)
            .slice(0, 1)
            .map((subscription) => (
              <div key={subscription.id} className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">{subscription.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {subscription.recommendation}
                </p>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  {t('screens.wallet.optimizePlan')}
                </Button>
              </div>
            ))}
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <BarChart3 className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewDetailedAnalysis')}
        </Button>
      </CardContent>
    </Card>
  );
}