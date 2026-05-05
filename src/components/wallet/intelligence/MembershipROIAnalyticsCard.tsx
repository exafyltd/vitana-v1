import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, TrendingUp, Calculator, Calendar, DollarSign, Target } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ROIMetric {
  id: string;
  category: string;
  spent: number;
  saved: number;
  roi: number;
  usage: number;
  period: string;
}

interface UpgradeRecommendation {
  tier: string;
  costIncrease: number;
  projectedSavings: number;
  breakEven: string;
  confidence: number;
  benefits: string[];
}

interface MembershipROIAnalyticsCardProps {
  className?: string;
}

const mockROIMetrics: ROIMetric[] = [
  {
    id: "1",
    category: "Lab Test Coverage",
    spent: 120,
    saved: 280,
    roi: 233,
    usage: 85,
    period: "Last 3 months"
  },
  {
    id: "2",
    category: "Health Coaching",
    spent: 99,
    saved: 450,
    roi: 355,
    usage: 92,
    period: "Last 3 months"
  },
  {
    id: "3",
    category: "Advanced Analytics",
    spent: 0,
    saved: 180,
    roi: 100,
    usage: 67,
    period: "Last 3 months"
  }
];

const upgradeRecommendation: UpgradeRecommendation = {
  tier: "Platinum",
  costIncrease: 49,
  projectedSavings: 180,
  breakEven: "1.2 months",
  confidence: 89,
  benefits: [
    "90% lab coverage (+15%)",
    "Unlimited coaching sessions",
    "Priority 24/7 support",
    "Advanced AI insights"
  ]
};

export function MembershipROIAnalyticsCard({ className }: MembershipROIAnalyticsCardProps) {
  const totalROI = Math.round(
    mockROIMetrics.reduce((sum, metric) => sum + metric.roi, 0) / mockROIMetrics.length
  );
  const totalSaved = mockROIMetrics.reduce((sum, metric) => sum + metric.saved, 0);
  const avgUsage = Math.round(
    mockROIMetrics.reduce((sum, metric) => sum + metric.usage, 0) / mockROIMetrics.length
  );

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t('screens.wallet.membershipRoiAnalytics')}
          </CardTitle>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">{t('screens.wallet.totalroiAverageRoi', { totalROI })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ROI Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-green-500/5 border border-emerald-200/50">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">${totalSaved}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.totalSaved')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{totalROI}%</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.avgRoi')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{avgUsage}%</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.utilization')}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('screens.wallet.yourMembership')} <span className="font-semibold text-emerald-600">{t('screens.wallet.highlyProfitable')}</span>{t('screens.wallet.basedUsage')}
          </p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            {t('screens.wallet.categoryPerformance')}
          </h4>
          
          {mockROIMetrics.slice(0, 2).map((metric) => (
            <div key={metric.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-medium">{metric.category}</h5>
                  <p className="text-xs text-muted-foreground">{t('screens.wallet.spentSpentSavedSaved', { spent: metric.spent, saved: metric.saved })}</p>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">{t('screens.wallet.roiRoi', { roi: metric.roi })}
                </Badge>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{t('screens.wallet.usageRate')}</span>
                  <span className="text-xs text-muted-foreground">{metric.usage}%</span>
                </div>
                <Progress value={metric.usage} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade Recommendation */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">{t('screens.wallet.upgradeAnalysis')}</span>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 ml-auto">{t('screens.wallet.confidenceConfidence', { confidence: upgradeRecommendation.confidence })}
            </Badge>
          </div>
          
          <div className="mb-3">
            <div className="text-sm font-medium mb-1">{t('screens.wallet.tierTierRecommendation', { tier: upgradeRecommendation.tier })}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('screens.wallet.additionalCost')}</span>
                <span className="font-semibold ml-1">{t('screens.wallet.costincreasemo', { costIncrease: upgradeRecommendation.costIncrease })}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('screens.wallet.breakeven')}</span>
                <span className="font-semibold ml-1">{upgradeRecommendation.breakEven}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 mb-3">
            {upgradeRecommendation.benefits.slice(0, 2).map((benefit, index) => (
              <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-purple-400" />
                {benefit}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-muted-foreground">{t('screens.wallet.projectedMonthlySavings')}</span>
              <span className="font-semibold text-emerald-600 ml-1">
                ${upgradeRecommendation.projectedSavings}
              </span>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2">
              <Crown className="h-3 w-3 mr-1" />
              {t('screens.wallet.upgrade')}
            </Button>
          </div>
        </div>

        {/* Usage Optimization */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{t('screens.wallet.usageOptimization')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('screens.wallet.youReUnderutilizingAdvancedAnalytics67')}
          </p>
          <Button size="sm" variant="outline" className="text-xs h-6 px-2 w-full">
            {t('screens.wallet.viewOptimizationTips')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}