import { useState } from "react";
import { Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletMasterActionPopup } from "@/components/wallet/WalletMasterActionPopup";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { WalletTransactionCard } from "@/components/wallet/WalletTransactionCard";
import { NewsCard } from "@/components/crossover/NewsCard";
import { SmartEarningsForecastCard } from "@/components/wallet/intelligence/SmartEarningsForecastCard";
import { IntelligentSpendingCard } from "@/components/wallet/intelligence/IntelligentSpendingCard";
import { PredictiveActionsCard } from "@/components/wallet/intelligence/PredictiveActionsCard";
import { DynamicRewardOpportunityCard } from "@/components/wallet/intelligence/DynamicRewardOpportunityCard";
import { walletNavigation } from "@/config/navigation";

// Mock data for Overview screen
const balanceOverviewData = [
  {
    type: "cash" as const,
    title: "Cash Balance",
    balance: "$2,847.32",
    subBalance: "Available for withdrawal",
    change: "+$124.50 this week",
    changeType: "increase" as const,
    status: "Active",
    description: "Your main cash balance ready for withdrawal to your bank account"
  },
  {
    type: "credits" as const,
    title: "Credits Balance", 
    balance: "1,547 Credits",
    subBalance: "Expires in 90 days",
    change: "+247 credits earned",
    changeType: "increase" as const,
    status: "Active",
    description: "Use credits for subscriptions, services, and premium features"
  },
  {
    type: "tokens" as const,
    title: "VTN Tokens",
    balance: "892 VTN",
    subBalance: "150 VTN staked",
    change: "+12.5% growth",
    changeType: "increase" as const,
    status: "Staking",
    description: "Your VITANA tokens for governance voting and staking rewards"
  }
];

const recentActivityData = [
  {
    id: "tx1",
    type: "reward" as const,
    title: "Biomarker Reward Earned",
    description: "Completed health assessment and shared biomarker data",
    amount: "+150 Credits",
    status: "completed" as const,
    timestamp: "2 hours ago",
    source: { name: "Health AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    category: "Health Data"
  },
  {
    id: "tx2", 
    type: "incoming" as const,
    title: "Referral Bonus",
    description: "Friend joined through your referral link",
    amount: "+$50.00",
    status: "completed" as const,
    timestamp: "Yesterday",
    source: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    category: "Referral"
  },
  {
    id: "tx3",
    type: "purchase" as const,
    title: "Premium Subscription",
    description: "Monthly premium health plan renewal",
    amount: "-$29.99",
    status: "completed" as const,
    timestamp: "3 days ago",
    source: { name: "VITANA", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    category: "Subscription"
  },
  {
    id: "tx4",
    type: "conversion" as const,
    title: "Credits to Cash",
    description: "Converted 500 credits to cash balance",
    amount: "+$125.00",
    status: "pending" as const,
    timestamp: "5 days ago",
    source: { name: "Wallet System", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    category: "Conversion"
  },
  {
    id: "tx5",
    type: "reward" as const,
    title: "Community Engagement",
    description: "Active participation in wellness challenges",
    amount: "+75 Credits",
    status: "completed" as const,
    timestamp: "1 week ago",
    source: { name: "Community AI", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    category: "Engagement"
  }
];

const quickActionsData = [
  {
    title: "Buy Credits - Special Offer 💰",
    description: "Get 25% bonus credits on your next purchase of $50+",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Finance",
    author: { name: "VITANA Store", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Limited Time"
  },
  {
    title: "Transfer to Friend 🤝",
    description: "Send credits or cash to another VITANA member instantly",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Social",
    author: { name: "Transfer Service", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Available 24/7"
  },
  {
    title: "Convert Rewards 🔄",
    description: "Turn your earned rewards into spendable credits automatically",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Rewards",
    author: { name: "Rewards Engine", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Instant Conversion"
  }
];

export default function Wallet() {
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("balance-overview");

  return (
    <AppLayout>
      <SEO title="Vitana Wallet | VITANA" description="Your digital bank account for health rewards and benefits" canonical={window.location.href} />
      <SubNavigation items={walletNavigation} />
      
      <div className="p-6">
        <StandardHeader
          title="Vitana Wallet"
          description="Your digital bank account for health rewards and benefits"
          emoji="🏦"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <ExpandableSearchButton 
            placeholder="Search transactions, rewards, or benefits..."
            onSearch={(query) => console.log('Search:', query)}
          />
          <Button size="sm" onClick={() => setMasterActionOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Wallet Actions
          </Button>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="balance-overview">Balance Overview</SplitBarTrigger>
            <SplitBarTrigger value="recent-activity">Recent Activity</SplitBarTrigger>
            <SplitBarTrigger value="quick-actions">Smart Actions</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="balance-overview">
            <div className="mt-6">
              {/* Row 1: Smart Earnings Forecast + Balance Cards */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <SmartEarningsForecastCard className="h-full" />
                </div>
                <div className="col-span-3">
                  <WalletBalanceCard
                    type={balanceOverviewData[0].type}
                    title={balanceOverviewData[0].title}
                    balance={balanceOverviewData[0].balance}
                    subBalance={balanceOverviewData[0].subBalance}
                    change={balanceOverviewData[0].change}
                    changeType={balanceOverviewData[0].changeType}
                    status={balanceOverviewData[0].status}
                    description={balanceOverviewData[0].description}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <WalletBalanceCard
                    type={balanceOverviewData[1].type}
                    title={balanceOverviewData[1].title}
                    balance={balanceOverviewData[1].balance}
                    subBalance={balanceOverviewData[1].subBalance}
                    change={balanceOverviewData[1].change}
                    changeType={balanceOverviewData[1].changeType}
                    status={balanceOverviewData[1].status}
                    description={balanceOverviewData[1].description}
                    className="h-full"
                  />
                </div>
              </div>

              <WalletMotivationalBanner variant="overview" />

              {/* Row 2: Additional Balance Card */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-12">
                  <WalletBalanceCard
                    type={balanceOverviewData[2].type}
                    title={balanceOverviewData[2].title}
                    balance={balanceOverviewData[2].balance}
                    subBalance={balanceOverviewData[2].subBalance}
                    change={balanceOverviewData[2].change}
                    changeType={balanceOverviewData[2].changeType}
                    status={balanceOverviewData[2].status}
                    description={balanceOverviewData[2].description}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="recent-activity">
            <div className="mt-6">
              {/* Row 1: Intelligent Spending + Transactions */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <IntelligentSpendingCard className="h-full" />
                </div>
                <div className="col-span-3">
                  <WalletTransactionCard
                    {...recentActivityData[0]}
                    className="h-full"
                  />
                </div>
                <div className="col-span-3">
                  <WalletTransactionCard
                    {...recentActivityData[1]}
                    className="h-full"
                  />
                </div>
              </div>

              <WalletMotivationalBanner variant="overview" />

              {/* Row 2: More Transactions */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-4">
                  <WalletTransactionCard
                    {...recentActivityData[2]}
                    className="h-full"
                  />
                </div>
                <div className="col-span-4">
                  <WalletTransactionCard
                    {...recentActivityData[3]}
                    className="h-full"
                  />
                </div>
                <div className="col-span-4">
                  <WalletTransactionCard
                    {...recentActivityData[4]}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="quick-actions">
            <div className="mt-6">
              {/* Row 1: AI Predictions + Dynamic Opportunities */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-6">
                  <PredictiveActionsCard className="h-full" />
                </div>
                <div className="col-span-6">
                  <DynamicRewardOpportunityCard className="h-full" />
                </div>
              </div>

              <WalletMotivationalBanner variant="overview" />

              {/* Row 2: Traditional Quick Actions */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-4">
                  <NewsCard
                    title={quickActionsData[0].title}
                    description={quickActionsData[0].description}
                    imageUrl={quickActionsData[0].imageUrl}
                    category={quickActionsData[0].category}
                    pillar={quickActionsData[0].pillar}
                    author={quickActionsData[0].author}
                    timestamp={quickActionsData[0].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-4">
                  <NewsCard
                    title={quickActionsData[1].title}
                    description={quickActionsData[1].description}
                    imageUrl={quickActionsData[1].imageUrl}
                    category={quickActionsData[1].category}
                    pillar={quickActionsData[1].pillar}
                    author={quickActionsData[1].author}
                    timestamp={quickActionsData[1].timestamp}
                    className="h-full"
                  />
                </div>
                <div className="col-span-4">
                  <NewsCard
                    title={quickActionsData[2].title}
                    description={quickActionsData[2].description}
                    imageUrl={quickActionsData[2].imageUrl}
                    category={quickActionsData[2].category}
                    pillar={quickActionsData[2].pillar}
                    author={quickActionsData[2].author}
                    timestamp={quickActionsData[2].timestamp}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>
        </SplitBar>

        <WalletMasterActionPopup 
          open={masterActionOpen}
          onOpenChange={setMasterActionOpen}
        />
      </div>
    </AppLayout>
  );
}