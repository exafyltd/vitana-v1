import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, Target, Clock, Star, TrendingUp } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SubscriptionRecommendation {
  id: string;
  name: string;
  price: number;
  match: number;
  category: "health" | "wellness" | "analytics" | "coaching";
  benefits: string[];
  popularity: number;
  timing: "optimal" | "good" | "wait";
  discount?: number;
  users: number;
  rating: number;
  description: string;
}

interface PersonalizedSubscriptionRecommendationCardProps {
  className?: string;
}

const mockRecommendations: SubscriptionRecommendation[] = [
  {
    id: "1",
    name: "AI Wellness Coach",
    price: 79,
    match: 94,
    category: "coaching",
    benefits: ["24/7 AI support", "Personalized plans", "Progress tracking"],
    popularity: 87,
    timing: "optimal",
    discount: 20,
    users: 2847,
    rating: 4.8,
    description: "AI-powered coaching tailored to your health patterns"
  },
  {
    id: "2",
    name: "Advanced Biomarker Insights",
    price: 129,
    match: 89,
    category: "analytics",
    benefits: ["Deep analysis", "Trend predictions", "Action recommendations"],
    popularity: 72,
    timing: "good",
    users: 1653,
    rating: 4.6,
    description: "Comprehensive biomarker analysis with predictive insights"
  },
  {
    id: "3",
    name: "Community Wellness Plus",
    price: 39,
    match: 76,
    category: "wellness",
    benefits: ["Group challenges", "Social features", "Reward multipliers"],
    popularity: 91,
    timing: "wait",
    discount: undefined,
    users: 5421,
    rating: 4.5,
    description: "Enhanced community features with gamified wellness"
  }
];

const getCategoryIcon = (category: SubscriptionRecommendation["category"]) => {
  switch (category) {
    case "health": return "🏥";
    case "wellness": return "🧘";
    case "analytics": return "📊";
    case "coaching": return "👨‍⚕️";
  }
};

const getTimingConfig = (timing: SubscriptionRecommendation["timing"]) => {
  switch (timing) {
    case "optimal":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        label: "Best Time"
      };
    case "good":
      return {
        color: "bg-blue-500/10 text-blue-600 border-blue-200",
        label: "Good Time"
      };
    case "wait":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        label: "Wait for Deal"
      };
  }
};

export function PersonalizedSubscriptionRecommendationCard({ className }: PersonalizedSubscriptionRecommendationCardProps) {
  const topRecommendation = mockRecommendations[0];
  const avgMatch = Math.round(
    mockRecommendations.reduce((sum, rec) => sum + rec.match, 0) / mockRecommendations.length
  );

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('screens.wallet.smartRecommendations')}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {avgMatch}% Avg Match
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Recommendation Highlight */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">{t('screens.wallet.perfectMatch')}</span>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">
              {topRecommendation.match}% match
            </Badge>
          </div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h5 className="text-sm font-semibold">{topRecommendation.name}</h5>
              <p className="text-xs text-muted-foreground">{topRecommendation.description}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                ${topRecommendation.price}
                {topRecommendation.discount && (
                  <span className="text-xs text-emerald-600 ml-1">
                    ({topRecommendation.discount}% off)
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.month')}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                {topRecommendation.users.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 text-amber-500" />
                {topRecommendation.rating}
              </div>
            </div>
            <Badge variant="outline" className={getTimingConfig(topRecommendation.timing).color}>
              {getTimingConfig(topRecommendation.timing).label}
            </Badge>
          </div>
          <Button size="sm" className="w-full h-7 text-xs">
            {t('screens.wallet.startFreeTrial')}
          </Button>
        </div>

        {/* Other Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            {t('screens.wallet.moreRecommendations')}
          </h4>
          
          {mockRecommendations.slice(1, 3).map((recommendation) => {
            const timingConfig = getTimingConfig(recommendation.timing);
            
            return (
              <div key={recommendation.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getCategoryIcon(recommendation.category)}</span>
                    <div>
                      <h5 className="text-sm font-medium">{recommendation.name}</h5>
                      <p className="text-xs text-muted-foreground">{recommendation.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">
                      {recommendation.match}% match
                    </Badge>
                    <div className="text-sm font-bold">${recommendation.price}/mo</div>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{t('screens.wallet.matchScore')}</span>
                    <span className="text-xs text-muted-foreground">{recommendation.match}%</span>
                  </div>
                  <Progress value={recommendation.match} className="h-1.5" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {recommendation.users.toLocaleString()}
                    </div>
                    <Badge variant="outline" className={`text-xs ${timingConfig.color}`}>
                      {timingConfig.label}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                    {t('screens.wallet.learnMore')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trending Alert */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-200/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{t('screens.wallet.trendingYourNetwork')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('screens.wallet.text87UsersWithSimilarHealthPatterns')}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-600 font-medium">{t('screens.wallet.limitedTime20OffFirst3')}</span>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2">
              <Clock className="h-3 w-3 mr-1" />
              {t('screens.wallet.claimDeal')}
            </Button>
          </div>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Sparkles className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewAllRecommendations')}
        </Button>
      </CardContent>
    </Card>
  );
}
