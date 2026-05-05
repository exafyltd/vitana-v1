import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp, Target, Calendar, Trophy, Zap } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface EarningStreak {
  id: string;
  category: string;
  currentStreak: number;
  bestStreak: number;
  multiplier: number;
  nextMilestone: number;
  progress: number;
  reward: number;
  status: "active" | "broken" | "paused";
}

interface NextOpportunity {
  id: string;
  title: string;
  description: string;
  streak: string;
  reward: number;
  deadline: string;
  difficulty: "easy" | "medium" | "hard";
}

interface EarningStreaksAnalyticsCardProps {
  className?: string;
}

const mockStreaks: EarningStreak[] = [
  {
    id: "1",
    category: "Daily Health Data",
    currentStreak: 12,
    bestStreak: 28,
    multiplier: 1.5,
    nextMilestone: 14,
    progress: 86,
    reward: 25,
    status: "active"
  },
  {
    id: "2",
    category: "Community Engagement",
    currentStreak: 7,
    bestStreak: 15,
    multiplier: 1.2,
    nextMilestone: 10,
    progress: 70,
    reward: 40,
    status: "active"
  },
  {
    id: "3",
    category: "Wellness Goals",
    currentStreak: 0,
    bestStreak: 21,
    multiplier: 1.0,
    nextMilestone: 3,
    progress: 0,
    reward: 15,
    status: "broken"
  }
];

const mockOpportunities: NextOpportunity[] = [
  {
    id: "1",
    title: "Weekend Warrior Streak",
    description: "Complete health activities for 2 weekend days",
    streak: "Weekend Challenge",
    reward: 75,
    deadline: "2 days",
    difficulty: "medium"
  },
  {
    id: "2",
    title: "Morning Routine Champion",
    description: "Share morning data before 9 AM for 5 days",
    streak: "Morning Data",
    reward: 50,
    deadline: "5 days",
    difficulty: "easy"
  }
];

const getStatusConfig = (status: EarningStreak["status"]) => {
  switch (status) {
    case "active":
      return {
        color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
        icon: Flame,
        label: "Active"
      };
    case "broken":
      return {
        color: "bg-red-500/10 text-red-600 border-red-200",
        icon: Target,
        label: "Broken"
      };
    case "paused":
      return {
        color: "bg-amber-500/10 text-amber-600 border-amber-200",
        icon: Calendar,
        label: "Paused"
      };
  }
};

const getDifficultyColor = (difficulty: NextOpportunity["difficulty"]) => {
  switch (difficulty) {
    case "easy": return "bg-emerald-500/10 text-emerald-600";
    case "medium": return "bg-amber-500/10 text-amber-600";
    case "hard": return "bg-red-500/10 text-red-600";
  }
};

export function EarningStreaksAnalyticsCard({ className }: EarningStreaksAnalyticsCardProps) {
  const activeStreaks = mockStreaks.filter(s => s.status === "active").length;
  const totalMultiplier = mockStreaks
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.multiplier, 0);
  const longestStreak = Math.max(...mockStreaks.map(s => s.bestStreak));

  return (
    <Card className={`${className} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('screens.wallet.earningStreaksAnalytics')}
          </CardTitle>
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">{t('screens.wallet.activestreaksActiveStreaks', { activeStreaks })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Streak Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-200/50">
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{activeStreaks}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.active')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{totalMultiplier.toFixed(1)}x</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.multiplier')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600">{longestStreak}</div>
              <div className="text-xs text-muted-foreground">{t('screens.wallet.bestStreak')}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {t('screens.wallet.yourStreaksBoostingEarningsBy')} <span className="font-semibold text-orange-600">{Math.round((totalMultiplier - activeStreaks) * 100)}%</span>
          </p>
        </div>

        {/* Active Streaks */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {t('screens.wallet.currentStreaks')}
          </h4>
          
          {mockStreaks.slice(0, 2).map((streak) => {
            const statusConfig = getStatusConfig(streak.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div key={streak.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="text-sm font-medium flex items-center gap-2">
                      {streak.category}
                      <StatusIcon className="h-3 w-3 text-orange-500" />
                    </h5>
                    <p className="text-xs text-muted-foreground">{t('screens.wallet.currentstreakDaysBestBeststreakDays', { currentStreak: streak.currentStreak, bestStreak: streak.bestStreak })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={statusConfig.color}>
                      {streak.multiplier}x
                    </Badge>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{t('screens.wallet.nextmilestoneDays', { nextMilestone: streak.nextMilestone })}
                    </span>
                    <span className="text-xs text-muted-foreground">{t('screens.wallet.rewardVtn', { reward: streak.reward })}
                    </span>
                  </div>
                  <Progress value={streak.progress} className="h-1.5" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500" />
            {t('screens.wallet.nextOpportunities')}
          </h4>
          
          {mockOpportunities.slice(0, 1).map((opportunity) => (
            <div key={opportunity.id} className="p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-200/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-medium">{opportunity.title}</h5>
                  <p className="text-xs text-muted-foreground">{opportunity.description}</p>
                </div>
                <Badge variant="outline" className={getDifficultyColor(opportunity.difficulty)}>
                  {opportunity.difficulty}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-xs text-purple-600 font-semibold">{t('screens.wallet.rewardVtn', { reward: opportunity.reward })}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('screens.wallet.deadlineLeft', { deadline: opportunity.deadline })}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                  {t('screens.wallet.startStreak')}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Streak Recovery for Broken Streaks */}
        {mockStreaks.some(s => s.status === "broken") && (
          <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-200/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{t('screens.wallet.streakRecovery')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t('screens.wallet.restartYourWellnessGoalsStreakToday')} {mockStreaks.find(s => s.status === "broken")?.bestStreak}{t('screens.wallet.dayRecord')}
            </p>
            <Button size="sm" variant="outline" className="text-xs h-6 px-2 w-full">
              {t('screens.wallet.restartStreak')}
            </Button>
          </div>
        )}

        {/* Quick Action */}
        <Button className="w-full" variant="outline">
          <Flame className="h-4 w-4 mr-2" />
          {t('screens.wallet.viewAllStreaks')}
        </Button>
      </CardContent>
    </Card>
  );
}