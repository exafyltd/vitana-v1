import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Calendar, Target, Clock, Zap } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EarningPrediction {
  id: string;
  source: string;
  prediction: number;
  confidence: number;
  timeframe: string;
  category: "health" | "wellness" | "data" | "engagement";
  trend: "increasing" | "stable" | "decreasing";
}

interface CreditEarningPredictionCardProps {
  className?: string;
}

const mockPredictions: EarningPrediction[] = [
  {
    id: "1",
    source: "Health Coaching Sessions",
    prediction: 150,
    confidence: 92,
    timeframe: "Next 7 days",
    category: "health",
    trend: "increasing"
  },
  {
    id: "2",
    source: "Biomarker Data Sharing",
    prediction: 75,
    confidence: 88,
    timeframe: "Next 3 days",
    category: "data",
    trend: "stable"
  },
  {
    id: "3",
    source: "Community Challenges",
    prediction: 200,
    confidence: 85,
    timeframe: "This week",
    category: "engagement",
    trend: "increasing"
  }
];

const getCategoryIcon = (category: EarningPrediction["category"]) => {
  switch (category) {
    case "health": return "🏥";
    case "wellness": return "🧘";
    case "data": return "📊";
    case "engagement": return "🤝";
  }
};

const getTrendColor = (trend: EarningPrediction["trend"]) => {
  switch (trend) {
    case "increasing": return "text-emerald-600";
    case "stable": return "text-blue-600";
    case "decreasing": return "text-amber-600";
  }
};

export function CreditEarningPredictionCard({ className }: CreditEarningPredictionCardProps) {
  const totalPredicted = mockPredictions.reduce((sum, prediction) => sum + prediction.prediction, 0);
  const averageConfidence = Math.round(
    mockPredictions.reduce((sum, prediction) => sum + prediction.confidence, 0) / mockPredictions.length
  );

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('screens.wallet.creditEarningForecast')}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{t('screens.wallet.totalpredictedCreditsExpected', { totalPredicted })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Prediction Confidence */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('screens.wallet.predictionConfidence')}</span>
            <span className="text-sm text-muted-foreground">{averageConfidence}%</span>
          </div>
          <Progress value={averageConfidence} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            {t('screens.wallet.basedYour')} <span className="font-semibold text-primary">{t('screens.wallet.recentActivityPatterns')}</span>
          </p>
        </div>

        {/* Top Earning Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            {t('screens.wallet.predictedEarnings')}
          </h4>
          
          {mockPredictions.slice(0, 2).map((prediction) => (
            <div key={prediction.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(prediction.category)}</span>
                  <div>
                    <h5 className="text-sm font-medium">{prediction.source}</h5>
                    <p className="text-xs text-muted-foreground">{t('screens.wallet.confidenceConfidenceTimeframe', { confidence: prediction.confidence, timeframe: prediction.timeframe })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs mb-1">{t('screens.wallet.predictionCredits', { prediction: prediction.prediction })}
                  </Badge>
                  <div className={`text-xs ${getTrendColor(prediction.trend)}`}>
                    {prediction.trend}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly Goal Progress */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-emerald-500/5 to-green-500/5 border-emerald-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium">{t('screens.wallet.weeklyEarningGoal')}</span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{t('screens.wallet.text425500Credits')}</span>
            <span className="text-xs text-emerald-600">{t('screens.wallet.text85Complete')}</span>
          </div>
          <Progress value={85} className="h-1.5 mb-2" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-emerald-600">{t('screens.wallet.text75Credits')}</span>{t('screens.wallet.neededReachGoal')}
          </p>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          {t('screens.wallet.optimizeEarningStrategy')}
        </Button>
      </CardContent>
    </Card>
  );
}