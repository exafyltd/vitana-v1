import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletRewardCard } from "@/components/wallet/WalletRewardCard";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Gift, Share, CreditCard } from "lucide-react";
import { useState } from "react";

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
  const [activeTab, setActiveTab] = useState("earned");

  const splitBarOptions = [
    { value: "earned", label: "Earned Rewards" },
    { value: "pending", label: "Pending Commissions" },
    { value: "referral", label: "Withdrawal & Referral" }
  ];

  const getContextualAction = () => {
    switch (activeTab) {
      case "earned":
        return { label: "Claim Rewards", icon: Gift };
      case "pending":
        return { label: "Request Payout", icon: CreditCard };
      case "referral":
        return { label: "Share Referral Link", icon: Share };
      default:
        return { label: "Claim Rewards", icon: Gift };
    }
  };

  const contextualAction = getContextualAction();

  return (
    <AppLayout>
      <SEO 
        title="Rewards & Commissions - Vitana Wallet" 
        description="Track your rewards, commissions, and achievements. Manage your referral program and earning opportunities."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Rewards & Commissions 🎁"
          description="Track your earnings, achievements, and referral rewards"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search rewards, commissions, or achievements..." />
          <contextualAction.icon className="h-4 w-4 mr-2" />
          {contextualAction.label}
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="earned">Earned Rewards</SplitBarTrigger>
            <SplitBarTrigger value="pending">Pending Commissions</SplitBarTrigger>
            <SplitBarTrigger value="referral">Withdrawal & Referral</SplitBarTrigger>
          </SplitBarList>

          <WalletMotivationalBanner variant="rewards" />

          <SplitBarContent value="earned">
            <div className="space-y-8">
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
              
              <WalletMotivationalBanner variant="rewards" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="pending">
            <div className="space-y-8">
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
              
              <WalletMotivationalBanner variant="rewards" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="referral">
            <div className="space-y-8">
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
              
              <WalletMotivationalBanner variant="rewards" />
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Rewards, SCREEN_IDS.WALLET_REWARDS);