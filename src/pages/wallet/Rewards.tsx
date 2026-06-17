import { useUrlTab } from "@/hooks/useUrlTab";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletRewardCard } from "@/components/wallet/WalletRewardCard";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { EarningStreaksAnalyticsCard } from "@/components/wallet/intelligence/EarningStreaksAnalyticsCard";
import { CommissionForecastingCard } from "@/components/wallet/intelligence/CommissionForecastingCard";
import { SocialEarningIntelligenceCard } from "@/components/wallet/intelligence/SocialEarningIntelligenceCard";
import { EarningIntelligenceSplitScreen } from "@/components/wallet/intelligence/EarningIntelligenceSplitScreen";
import { Plus } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

const rewardsData = {
  earned: [
    {
      id: "1",
      type: "earned" as const,
      title: "Health Challenge Completion",
      description: "Completed 30-day wellness challenge with perfect attendance",
      amount: "250 credits",
      status: "available" as const,
      category: "Wellness",
      dueDate: "Available now"
    },
    {
      id: "2", 
      type: "earned" as const,
      title: "Monthly Streak Bonus",
      description: "Maintained daily health tracking for entire month",
      amount: "150 credits",
      status: "available" as const,
      category: "Consistency"
    }
  ],
  pending: [
    {
      id: "3",
      type: "pending" as const,
      title: "Referral Commission",
      description: "Friend signed up for Premium plan - commission processing",
      amount: "$25.00",
      status: "pending" as const,
      source: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
      dueDate: "Processing (3-5 days)"
    },
    {
      id: "4",
      type: "pending" as const, 
      title: "Business Hub Revenue",
      description: "January coaching session commissions",
      amount: "$180.00",
      status: "pending" as const,
      dueDate: "Available Feb 1st"
    }
  ],
  referral: [
    {
      id: "5",
      type: "referral" as const,
      title: "Share Your Link",
      description: "Invite friends and earn $50 for each Premium subscription",
      amount: "$50 per referral",
      status: "available" as const,
      category: "Referral Program"
    },
    {
      id: "6",
      type: "achievement" as const,
      title: "Community Builder Achievement", 
      description: "Refer 10 friends to unlock $500 bonus",
      amount: "$500 bonus",
      progress: 7,
      maxProgress: 10,
      status: "pending" as const,
      category: "Achievement"
    }
  ]
};

function Rewards() {
  const [activeTab, setActiveTab] = useUrlTab("tab", "earned");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  return (
    <AppLayout>
      <SEO 
        title={t('screens.wallet.rewardsCommissionsVitanaWallet')} 
        description="Track your rewards, commissions, and achievements. Manage your referral program and earning opportunities."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        <StandardHeader 
          title={t('screens.wallet.rewardsCommissions')}
          description="Track your earnings, achievements, and referral rewards"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.wallet.searchRewardsCommissionsAchievements')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setActionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('screens.wallet.quickActions')}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="earned">{t('screens.wallet.earnedRewards')}</SplitBarTrigger>
            <SplitBarTrigger value="pending">{t('screens.wallet.pendingCommissions')}</SplitBarTrigger>
            <SplitBarTrigger value="referral">{t('screens.wallet.withdrawalReferral')}</SplitBarTrigger>
            <SplitBarTrigger value="intelligence">{t('screens.wallet.earningIntelligence')}</SplitBarTrigger>
          </SplitBarList>

          <WalletMotivationalBanner variant="rewards" />

          <SplitBarContent value="earned">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EarningStreaksAnalyticsCard />
                <WalletMotivationalBanner variant="rewards" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewardsData.earned.map((reward) => (
                  <WalletRewardCard
                    key={reward.id}
                    {...reward}
                    onClaim={() => console.log('Claim reward:', reward.id)}
                    onClick={() => console.log('Reward clicked:', reward.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="pending">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CommissionForecastingCard />
                <WalletMotivationalBanner variant="rewards" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewardsData.pending.map((commission) => (
                  <WalletRewardCard
                    key={commission.id}
                    {...commission}
                    onClaim={() => console.log('Request payout:', commission.id)}
                    onClick={() => console.log('Commission clicked:', commission.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="referral">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SocialEarningIntelligenceCard />
                <WalletMotivationalBanner variant="rewards" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rewardsData.referral.map((referral) => (
                  <WalletRewardCard
                    key={referral.id}
                    {...referral}
                    onClaim={() => console.log('Share referral:', referral.id)}
                    onClick={() => console.log('Referral clicked:', referral.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="intelligence">
            <EarningIntelligenceSplitScreen />
          </SplitBarContent>
        </SplitBar>

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('screens.wallet.quickActions')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {activeTab === "earned" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{t('screens.wallet.selectRewardsClaimConvertYourWallet')}</p>
                  <div className="space-y-2">
                    {rewardsData.earned.filter(r => r.status === "available").map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{reward.title}</h4>
                          <p className="text-sm text-muted-foreground">{reward.amount}</p>
                        </div>
                        <Button size="sm" onClick={() => console.log('Claim:', reward.id)}>
                          {t('screens.wallet.claim')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === "pending" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{t('screens.wallet.requestPayoutForYourPendingCommissions')}</p>
                  <div className="space-y-2">
                    {rewardsData.pending.map((commission) => (
                      <div key={commission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{commission.title}</h4>
                          <p className="text-sm text-muted-foreground">{commission.amount}</p>
                          <p className="text-xs text-muted-foreground">{commission.dueDate}</p>
                        </div>
                        <Button size="sm" disabled={commission.status === "pending"}>
                          {commission.status === "pending" ? "Processing" : "Request"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "referral" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">{t('screens.wallet.shareYourReferralLinkEarnCommissions')}</p>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">{t('screens.wallet.yourReferralLink')}</h4>
                    <div className="flex gap-2">
                      <input 
                        value="https://vitana.app/join/your-referral-code" 
                        readOnly 
                        className="flex-1 px-3 py-2 text-sm border rounded"
                      />
                      <Button size="sm" onClick={() => console.log('Copy link')}>
                        {t('screens.wallet.copy')}
                      </Button>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => console.log('Share via social')}>
                    {t('screens.wallet.shareViaSocialMedia')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Rewards, SCREEN_IDS.WALLET_REWARDS);