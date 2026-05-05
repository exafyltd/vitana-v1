import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RewardDot } from "@/components/ui/reward-dot";
import { Gift, Clock, Users, Zap, Timer } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface RewardOpportunity {
  id: string;
  title: string;
  description: string;
  multiplier: number;
  expiresIn: string;
  category: "limited" | "social" | "streak" | "bonus";
  participants?: number;
  maxParticipants?: number;
  requirements: string[];
  baseReward: number;
  isActive: boolean;
  urgency: "critical" | "high" | "medium" | "low";
}

interface DynamicRewardOpportunityCardProps {
  className?: string;
}

const mockOpportunities: RewardOpportunity[] = [
  {
    id: "1",
    title: "2x Morning Data Share",
    description: "Double rewards for sharing morning biomarkers",
    multiplier: 2,
    expiresIn: "4 hours",
    category: "limited",
    baseReward: 25,
    isActive: true,
    urgency: "critical",
    requirements: ["Complete morning routine", "Share sleep data", "Log morning vitals"]
  },
  {
    id: "2",
    title: "Community Challenge Streak",
    description: "Join 50+ people in the wellness challenge",
    multiplier: 1.5,
    expiresIn: "2 days",
    category: "social",
    participants: 47,
    maxParticipants: 50,
    baseReward: 100,
    isActive: true,
    urgency: "high",
    requirements: ["Join challenge", "Complete daily tasks", "Share progress"]
  },
  {
    id: "3",
    title: "7-Day Consistency Bonus", 
    description: "Maintain daily data sharing streak",
    multiplier: 3,
    expiresIn: "ongoing",
    category: "streak",
    baseReward: 200,
    isActive: true,
    urgency: "medium",
    requirements: ["Daily check-ins", "Data consistency", "Weekly summary"]
  }
];

const getCategoryConfig = (category: RewardOpportunity["category"]) => {
  switch (category) {
    case "limited":
      return {
        icon: Timer,
        color: "bg-red-500/10 text-red-600 border-red-200",
        label: "Limited Time",
        gradient: "from-red-500/10 to-orange-500/10"
      };
    case "social":
      return {
        icon: Users,
        color: "bg-blue-500/10 text-blue-600 border-blue-200",
        label: "Social",
        gradient: "from-blue-500/10 to-purple-500/10"
      };
    case "streak":
      return {
        icon: Zap,
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        label: "Streak Bonus",
        gradient: "from-amber-500/10 to-yellow-500/10"
      };
    case "bonus":
      return {
        icon: Gift,
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        label: "Bonus",
        gradient: "from-emerald-500/10 to-green-500/10"
      };
  }
};

const getUrgencyColor = (urgency: RewardOpportunity["urgency"]) => {
  switch (urgency) {
    case "critical": return "animate-pulse bg-red-500";
    case "high": return "bg-amber-500";
    case "medium": return "bg-blue-500";
    case "low": return "bg-emerald-500";
  }
};

export function DynamicRewardOpportunityCard({ className }: DynamicRewardOpportunityCardProps) {
  const activeOpportunities = mockOpportunities.filter(opp => opp.isActive);
  const totalPotential = activeOpportunities.reduce((sum, opp) => sum + (opp.baseReward * opp.multiplier), 0);

  return (
    <Card className={`${className} relative`}>
      <RewardDot 
        points={15} 
        description="Join live opportunities for bonus rewards"
        position="top-right"
        size="md"
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            {t('screens.wallet.liveOpportunities')}
          </CardTitle>
          <Badge variant="secondary" className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground">
            {totalPotential} VTN Available
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {activeOpportunities.slice(0, 2).map((opportunity) => {
          const config = getCategoryConfig(opportunity.category);
          const IconComponent = config.icon;
          const participationProgress = opportunity.participants && opportunity.maxParticipants 
            ? (opportunity.participants / opportunity.maxParticipants) * 100 
            : 0;

          return (
            <div 
              key={opportunity.id} 
              className={`p-3 rounded-lg border bg-gradient-to-r ${config.gradient} hover:scale-[1.02] transition-all duration-200 cursor-pointer group relative`}
            >
              {/* Urgency indicator */}
              <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getUrgencyColor(opportunity.urgency)}`} />
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white/20">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-semibold">{opportunity.title}</h5>
                    <p className="text-xs text-muted-foreground">{opportunity.description}</p>
                  </div>
                </div>
                <Badge variant="outline" className={config.color}>
                  {opportunity.multiplier}x
                </Badge>
              </div>

              {/* Social progress */}
              {opportunity.participants && opportunity.maxParticipants && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{t('screens.wallet.communityProgress')}</span>
                    <span className="text-xs text-muted-foreground">
                      {opportunity.participants}/{opportunity.maxParticipants}
                    </span>
                  </div>
                  <Progress value={participationProgress} className="h-1.5" />
                </div>
              )}

              {/* Requirements */}
              <div className="mb-3">
                <span className="text-xs font-medium mb-1 block">{t('screens.wallet.requirements')}</span>
                <div className="flex flex-wrap gap-1">
                  {opportunity.requirements.slice(0, 2).map((req, index) => (
                    <Badge key={index} variant="outline" className="text-xs h-5 px-2">
                      {req}
                    </Badge>
                  ))}
                  {opportunity.requirements.length > 2 && (
                    <Badge variant="outline" className="text-xs h-5 px-2">
                      +{opportunity.requirements.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold">
                    {opportunity.baseReward * opportunity.multiplier} VTN
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {opportunity.expiresIn}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  {t('screens.wallet.joinNow')}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{activeOpportunities.length}</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.active')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-emerald-600">{totalPotential}</div>
            <div className="text-xs text-muted-foreground">{t('screens.wallet.totalVtn')}</div>
          </div>
        </div>

        {/* Action Button */}
        <Button className="w-full" variant="default">
          <Gift className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewAllOpportunities')}
        </Button>
      </CardContent>
    </Card>
  );
}