import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Gift, TrendingUp, Users, Award, Target, Star } from "lucide-react";

const rewardsData = {
  totalEarned: 2450.75,
  pendingRewards: 125.50,
  referralStats: {
    totalReferrals: 12,
    activeReferrals: 8,
    lifetimeCommissions: 1200.00,
    thisMonth: 250.00
  },
  achievements: [
    { name: "Health Champion", description: "Complete 30 days of health tracking", progress: 85, target: 100, reward: 50 },
    { name: "Community Builder", description: "Refer 10 new members", progress: 8, target: 10, reward: 100 },
    { name: "Wellness Warrior", description: "Participate in 5 challenges", progress: 3, target: 5, reward: 25 }
  ],
  recentEarnings: [
    { date: "2024-01-15", source: "Referral Commission", amount: 25.00, type: "referral" },
    { date: "2024-01-12", source: "Health Challenge Completion", amount: 50.00, type: "challenge" },
    { date: "2024-01-10", source: "Monthly Streak Bonus", amount: 30.00, type: "streak" },
    { date: "2024-01-08", source: "Community Engagement", amount: 15.00, type: "engagement" }
  ],
  referralProgram: {
    baseCommission: 10,
    tierBonus: 5,
    currentTier: "Gold",
    nextTier: "Platinum",
    progressToNext: 75
  }
};

function Rewards() {
  return (
    <AppLayout>
      <SEO 
        title="Rewards & Commissions - Vitana Wallet" 
        description="Track your rewards, commissions, and achievements. Manage your referral program and view earning opportunities."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Rewards & Commissions"
          description="Track your earnings, achievements, and referral rewards"
        />

        {/* Rewards Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${rewardsData.totalEarned.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">All time rewards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${rewardsData.pendingRewards.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewardsData.referralStats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">{rewardsData.referralStats.activeReferrals} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${rewardsData.referralStats.thisMonth.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Commissions earned</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referral Program */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Referral Program
              </CardTitle>
              <CardDescription>
                Earn commissions by referring new members
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">${rewardsData.referralProgram.baseCommission}%</div>
                  <div className="text-sm text-muted-foreground">Base Commission</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">${rewardsData.referralProgram.tierBonus}%</div>
                  <div className="text-sm text-muted-foreground">Tier Bonus</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Tier: {rewardsData.referralProgram.currentTier}</span>
                  <span>Next: {rewardsData.referralProgram.nextTier}</span>
                </div>
                <Progress value={rewardsData.referralProgram.progressToNext} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {rewardsData.referralProgram.progressToNext}% to next tier
                </div>
              </div>
              
              <div className="space-y-2">
                <Button className="w-full">Share Referral Link</Button>
                <Button variant="outline" className="w-full">View Program Details</Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Active Achievements
              </CardTitle>
              <CardDescription>
                Complete goals to earn rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rewardsData.achievements.map((achievement, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{achievement.name}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                    </div>
                    <Badge variant="outline">${achievement.reward}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{achievement.progress}/{achievement.target}</span>
                      <span>{Math.round((achievement.progress/achievement.target)*100)}%</span>
                    </div>
                    <Progress value={(achievement.progress/achievement.target)*100} className="h-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Recent Earnings
            </CardTitle>
            <CardDescription>
              Your latest rewards and commission activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rewardsData.recentEarnings.map((earning, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{earning.source}</div>
                    <div className="text-sm text-muted-foreground">{earning.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{earning.type}</Badge>
                    <div className="font-bold text-green-600">+${earning.amount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Refer Friends
          </Button>
          <Button variant="outline">
            <Target className="h-4 w-4 mr-2" />
            View All Achievements
          </Button>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Earnings History
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Rewards, SCREEN_IDS.WALLET_REWARDS);