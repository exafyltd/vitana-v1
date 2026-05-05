import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Network, TrendingUp, Star, Target, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface NetworkAnalysis {
  id: string;
  metric: string;
  value: number;
  change: number;
  rank: number;
  potential: number;
}

interface SocialOpportunity {
  id: string;
  title: string;
  description: string;
  network: string;
  participants: number;
  reward: number;
  multiplier: number;
  category: "referral" | "collaboration" | "mentoring" | "community";
  difficulty: "easy" | "medium" | "hard";
}

interface SocialEarningIntelligenceCardProps {
  className?: string;
}

const mockNetworkAnalysis: NetworkAnalysis[] = [
  {
    id: "1",
    metric: "Network Size",
    value: 47,
    change: 12,
    rank: 23,
    potential: 85
  },
  {
    id: "2",
    metric: "Influence Score",
    value: 76,
    change: 8,
    rank: 15,
    potential: 92
  },
  {
    id: "3",
    metric: "Collaboration Rate",
    value: 34,
    change: -3,
    rank: 42,
    potential: 68
  }
];

const mockSocialOpportunities: SocialOpportunity[] = [
  {
    id: "1",
    title: "Wellness Mentor Program",
    description: "Guide 3 new members through their first month",
    network: "Health Coaches",
    participants: 12,
    reward: 150,
    multiplier: 2.5,
    category: "mentoring",
    difficulty: "medium"
  },
  {
    id: "2",
    title: "Community Challenge Leader",
    description: "Lead a 7-day wellness challenge",
    network: "Wellness Community",
    participants: 28,
    reward: 200,
    multiplier: 3.0,
    category: "community",
    difficulty: "hard"
  },
  {
    id: "3",
    title: "Referral Sprint Bonus",
    description: "Refer 5 friends this month for bonus rewards",
    network: "Personal Network",
    participants: 156,
    reward: 75,
    multiplier: 1.8,
    category: "referral",
    difficulty: "easy"
  }
];

const getCategoryIcon = (category: SocialOpportunity["category"]) => {
  switch (category) {
    case "referral": return "🤝";
    case "collaboration": return "⚡";
    case "mentoring": return "🎓";
    case "community": return "👥";
  }
};

const getDifficultyColor = (difficulty: SocialOpportunity["difficulty"]) => {
  switch (difficulty) {
    case "easy": return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
    case "medium": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "hard": return "bg-red-500/10 text-red-600 border-red-200";
  }
};

const getRankColor = (rank: number) => {
  if (rank <= 10) return "text-yellow-600";
  if (rank <= 25) return "text-emerald-600";
  if (rank <= 50) return "text-blue-600";
  return "text-muted-foreground";
};

export function SocialEarningIntelligenceCard({ className }: SocialEarningIntelligenceCardProps) {
  const totalNetworkValue = mockNetworkAnalysis.reduce((sum, analysis) => sum + analysis.value, 0);
  const avgRank = Math.round(
    mockNetworkAnalysis.reduce((sum, analysis) => sum + analysis.rank, 0) / mockNetworkAnalysis.length
  );
  const totalPotential = mockSocialOpportunities.reduce((sum, opp) => sum + opp.reward, 0);

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Social Earning Intelligence
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Rank #{avgRank}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Network Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-200/50">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{totalNetworkValue}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.networkScore')}</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${getRankColor(avgRank)}`}>#{avgRank}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.avgRank')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{totalPotential}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.vtnAvailable')}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Your social earning potential is <span className="font-semibold text-blue-600">{t('screens.wallet.aboveAverage')}</span>
          </p>
        </div>

        {/* Network Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-green-500" />
            Network Analysis
          </h4>
          
          {mockNetworkAnalysis.slice(0, 2).map((analysis) => (
            <div key={analysis.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-medium">{analysis.metric}</h5>
                  <p className="text-xs text-muted-foreground">
                    Current: {analysis.value} • Rank: #{analysis.rank}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={analysis.change >= 0 ? 
                    "bg-emerald-500/10 text-emerald-600" : 
                    "bg-red-500/10 text-red-600"
                  }>
                    {analysis.change >= 0 ? '+' : ''}{analysis.change}%
                  </Badge>
                </div>
              </div>
              
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Potential</span>
                  <span className="text-xs text-muted-foreground">{analysis.potential}%</span>
                </div>
                <Progress value={analysis.potential} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Social Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Social Opportunities
          </h4>
          
          {mockSocialOpportunities.slice(0, 2).map((opportunity) => (
            <div key={opportunity.id} className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-200/50">
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
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">
                  {opportunity.network} • {opportunity.participants} participants
                </div>
                <div className="text-xs text-purple-600 font-semibold">
                  {opportunity.multiplier}x multiplier
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-emerald-600">
                  +{opportunity.reward} VTN
                </div>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  Join Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Network Growth Tip */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-200/50">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">{t('screens.wallet.growthOpportunity')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Increase your collaboration rate by 15% to move into top 25 earners
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 font-medium">{t('screens.wallet.potential40MonthlyEarnings')}</span>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2">
              <Target className="h-3 w-3 mr-1" />
              Focus Here
            </Button>
          </div>
        </div>

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Network className="h-4 w-4 mr-2" />
          Expand Network
        </Button>
      </CardContent>
    </Card>
  );
}