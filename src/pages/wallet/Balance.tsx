import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { WalletTransactionCard } from "@/components/wallet/WalletTransactionCard";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { CreditCard, Coins, Shield, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";

const balanceData = {
  credits: {
    balance: 2450,
    pending: 125,
    expiry: "March 15, 2024",
    transactions: [
      { id: "1", title: "Health Coach Session Reward", timestamp: "2024-01-15", description: "Health Coach Session Reward", amount: "25", type: "reward" as const, status: "completed" as const },
      { id: "2", title: "Challenge Completion Bonus", timestamp: "2024-01-12", description: "Challenge Completion Bonus", amount: "50", type: "reward" as const, status: "completed" as const },
      { id: "3", title: "Monthly Streak Reward", timestamp: "2024-01-10", description: "Monthly Streak Reward", amount: "30", type: "reward" as const, status: "completed" as const }
    ]
  },
  tokens: {
    vtn: 1250,
    staked: 800,
    rewards: 45.50,
    governance: [
      { id: "gov1", title: "Community Fund Allocation", timestamp: "Active", description: "Governance: Community Fund Allocation", amount: "800", type: "reward" as const, status: "completed" as const, votingPower: 800 },
      { id: "gov2", title: "New Feature Roadmap", timestamp: "Completed", description: "Governance: New Feature Roadmap", amount: "600", type: "reward" as const, status: "completed" as const, votingPower: 600 }
    ]
  },
  membership: {
    tier: "Premium",
    coverage: 75,
    benefits: [
      { id: "ben1", title: "Health Coaching", timestamp: "Active", description: "Health Coaching", amount: "0", type: "reward" as const, status: "completed" as const, value: "Unlimited Sessions" },
      { id: "ben2", title: "Lab Test Coverage", timestamp: "Active", description: "Lab Test Coverage", amount: "0", type: "reward" as const, status: "completed" as const, value: "75% Coverage" },
      { id: "ben3", title: "Advanced Analytics", timestamp: "Active", description: "Advanced Analytics", amount: "0", type: "reward" as const, status: "completed" as const, value: "Full Access" },
      { id: "ben4", title: "Priority Support", timestamp: "Active", description: "Priority Support", amount: "0", type: "reward" as const, status: "completed" as const, value: "24/7 Available" }
    ]
  }
};

function Balance() {
  const [activeTab, setActiveTab] = useState("credits");

  const splitBarOptions = [
    { value: "credits", label: "Credits Account" },
    { value: "tokens", label: "Tokens Account" },
    { value: "membership", label: "Membership Benefits" }
  ];

  const getContextualAction = () => {
    switch (activeTab) {
      case "credits":
        return { label: "Top Up Credits", icon: Plus };
      case "tokens":
        return { label: "Buy/Stake Tokens", icon: Coins };
      case "membership":
        return { label: "Upgrade Plan", icon: TrendingUp };
      default:
        return { label: "Top Up Credits", icon: Plus };
    }
  };

  const contextualAction = getContextualAction();

  return (
    <AppLayout>
      <SEO 
        title="Balance & Benefits - Vitana Wallet" 
        description="Manage your credits, tokens, and membership benefits in your Vitana wallet."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Balance & Benefits 💳"
          description="Manage your credits, tokens, and membership benefits"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search balances, transactions, or benefits..." />
          <Button size="sm">
            <contextualAction.icon className="h-4 w-4 mr-2" />
            {contextualAction.label}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="credits">Credits Account</SplitBarTrigger>
            <SplitBarTrigger value="tokens">Tokens Account</SplitBarTrigger>
            <SplitBarTrigger value="membership">Membership Benefits</SplitBarTrigger>
          </SplitBarList>

          <WalletMotivationalBanner 
            variant="balance" 
            activeTab={activeTab}
          />

          <SplitBarContent value="credits">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletBalanceCard
                  type="credits"
                  title="Credits Balance"
                  balance={`${balanceData.credits.balance.toLocaleString()} credits`}
                  subBalance={`${balanceData.credits.pending} credits pending`}
                  change="+125 this week"
                  changeType="increase"
                  status="Active"
                  description="Use credits for health services, lab tests, and premium features"
                />
                <WalletBalanceCard
                  type="credits"
                  title="Credits Expiry"
                  balance={balanceData.credits.expiry}
                  description="Keep your credits active by using them regularly"
                  status="Tracked"
                />
              </div>

              <WalletMotivationalBanner 
                variant="balance" 
                activeTab="credits"
              />

              <div className="grid grid-cols-1 gap-4">
                {balanceData.credits.transactions.map((transaction) => (
                  <WalletTransactionCard
                    key={transaction.id}
                    {...transaction}
                    onClick={() => console.log('Transaction clicked:', transaction.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="tokens">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletBalanceCard
                  type="tokens"
                  title="VTN Balance"
                  balance={`${balanceData.tokens.vtn.toLocaleString()} VTN`}
                  subBalance={`${balanceData.tokens.staked} staked`}
                  change="+5.2% APY"
                  changeType="increase"
                  status="Staking"
                  description="Vitana Network tokens for governance and rewards"
                />
                <WalletBalanceCard
                  type="tokens"
                  title="Staking Rewards"
                  balance={`${balanceData.tokens.rewards} VTN`}
                  description="Accumulated rewards from staking your VTN tokens"
                  status="Claimable"
                />
              </div>

              <WalletMotivationalBanner 
                variant="balance" 
                activeTab="tokens"
              />

              <div className="grid grid-cols-1 gap-4">
                {balanceData.tokens.governance.map((vote) => (
                  <WalletTransactionCard
                    key={vote.id}
                    {...vote}
                    onClick={() => console.log('Governance clicked:', vote.title)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="membership">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletBalanceCard
                  type="cash"
                  title="Membership Tier"
                  balance={balanceData.membership.tier}
                  subBalance={`${balanceData.membership.coverage}% coverage`}
                  description="Your current membership level and benefits coverage"
                  status="Active"
                />
                <WalletBalanceCard
                  type="cash"
                  title="Upgrade Benefits"
                  balance="Platinum Tier"
                  description="Unlock 90% coverage + exclusive perks"
                  status="Available"
                />
              </div>

              <WalletMotivationalBanner 
                variant="balance" 
                activeTab="membership"
              />

              <div className="grid grid-cols-1 gap-4">
                {balanceData.membership.benefits.map((benefit) => (
                  <WalletTransactionCard
                    key={benefit.id}
                    {...benefit}
                    onClick={() => console.log('Benefit clicked:', benefit.title)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Balance, SCREEN_IDS.WALLET_BALANCE);