import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RewardDot } from "@/components/ui/reward-dot";
import { TrendingUp, Zap, Clock, Target } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EarningOpportunity {
  id: string;
  title: string;
  description: string;
  potential: number;
  timeframe: string;
  difficulty: "easy" | "medium" | "hard";
  category: "health" | "community" | "data" | "referral";
  urgency?: "high" | "medium" | "low";
}

interface SmartEarningsForecastCardProps {
  className?: string;
}

const mockOpportunities: EarningOpportunity[] = [
  {
    id: "1",
    title: "Complete Sleep Tracking",
    description: "Share 7 days of sleep data for wellness insights",
    potential: 25,
    timeframe: "Next 3 days",
    difficulty: "easy",
    category: "health",
    urgency: "high"
  },
  {
    id: "2", 
    title: "Community Event Participation",
    description: "Join upcoming wellness challenge",
    potential: 50,
    timeframe: "This week",
    difficulty: "medium",
    category: "community",
    urgency: "medium"
  },
  {
    id: "3",
    title: "Biomarker Data Sharing",
    description: "Upload recent lab results",
    potential: 100,
    timeframe: "Next 7 days",
    difficulty: "easy",
    category: "data",
    urgency: "low"
  }
];

const getCategoryIcon = (category: EarningOpportunity["category"]) => {
  switch (category) {
    case "health": return "🏃";
    case "community": return "👥";
    case "data": return "📊";
    case "referral": return "🤝";
  }
};

const getDifficultyColor = (difficulty: EarningOpportunity["difficulty"]) => {
  switch (difficulty) {
    case "easy": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "medium": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "hard": return "bg-red-500/10 text-red-600 border-red-200";
  }
};

const getUrgencyColor = (urgency: EarningOpportunity["urgency"]) => {
  switch (urgency) {
    case "high": return "bg-red-500/10 text-red-600";
    case "medium": return "bg-amber-500/10 text-amber-600";
    case "low": return "bg-emerald-500/10 text-emerald-600";
    default: return "bg-muted/50 text-muted-foreground";
  }
};

export function SmartEarningsForecastCard({ className }: SmartEarningsForecastCardProps) {
  const totalPotential = mockOpportunities.reduce((sum, opp) => sum + opp.potential, 0);
  const completionProgress = 65; // Mock progress based on user activity

  return (
    <Card className={`${className} relative`}>
      <RewardDot 
        points={8} 
        description="Complete forecast actions for bonus credits"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('screens.wallet.earningForecast')}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{t('screens.wallet.totalpotentialVtnaAvailable', { totalPotential })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Weekly Progress */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('screens.wallet.weeklyGoalProgress')}</span>
            <span className="text-sm text-muted-foreground">{completionProgress}%</span>
          </div>
          <Progress value={completionProgress} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground">
            {t('screens.wallet.trackEarn')} <span className="font-semibold text-primary">{t('screens.wallet.text150Vtna')}</span>{t('screens.wallet.thisWeek')}
          </p>
        </div>

        {/* Top Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {t('screens.wallet.nextBestActions')}
          </h4>
          
          {mockOpportunities.slice(0, 2).map((opportunity) => (
            <div key={opportunity.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(opportunity.category)}</span>
                  <div>
                    <h5 className="text-sm font-medium">{opportunity.title}</h5>
                    <p className="text-xs text-muted-foreground">{opportunity.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={getDifficultyColor(opportunity.difficulty)}>
                  {opportunity.difficulty}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{t('screens.wallet.potentialVtna', { potential: opportunity.potential })}
                  </Badge>
                  {opportunity.urgency && (
                    <Badge variant="outline" className={`text-xs ${getUrgencyColor(opportunity.urgency)}`}>{t('screens.wallet.urgencyPriority', { urgency: opportunity.urgency })}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {opportunity.timeframe}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Target className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewAllOpportunities')}
        </Button>
      </CardContent>
    </Card>
  );
}