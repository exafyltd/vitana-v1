import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { WalletTransactionCard } from "@/components/wallet/WalletTransactionCard";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { CreditEarningPredictionCard } from "@/components/wallet/intelligence/CreditEarningPredictionCard";
import { TokenMarketIntelligenceCard } from "@/components/wallet/intelligence/TokenMarketIntelligenceCard";
import { MembershipROIAnalyticsCard } from "@/components/wallet/intelligence/MembershipROIAnalyticsCard";
import { EarningOptimizationSplitScreen } from "@/components/wallet/intelligence/EarningOptimizationSplitScreen";
import { CreditCard, Coins, Shield, Plus, TrendingUp } from "lucide-react";
import { isIAPRestricted } from "@/lib/appilix";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/context/AuthProvider";

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
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isTokensOpen, setIsTokensOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const { balances, transactions, loading, error, getBalance, isLoaded } = useWallet();
  const { user } = useAuth();

  const splitBarOptions = [
    { value: "credits", label: "Credits Account" },
    { value: "tokens", label: "Tokens Account" },
    { value: "membership", label: "Membership Benefits" },
    { value: "optimization", label: "Earning Optimization" }
  ];

  const getContextualAction = () => {
    if (isIAPRestricted()) return null;
    switch (activeTab) {
      case "credits":
        return { label: "Top Up Credits", icon: Plus, onClick: () => setIsTopUpOpen(true) };
      case "tokens":
        return { label: "Buy/Stake Tokens", icon: Coins, onClick: () => setIsTokensOpen(true) };
      case "membership":
        return { label: "Upgrade Plan", icon: TrendingUp, onClick: () => setIsUpgradeOpen(true) };
      default:
        return { label: "Top Up Credits", icon: Plus, onClick: () => setIsTopUpOpen(true) };
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
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        <StandardHeader 
          title="Balance & Benefits 💳"
          description="Manage your credits, tokens, and membership benefits"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder="Search balances, transactions, or benefits..." />
          <UniversalCalendarButton />
          <Button size="sm" onClick={contextualAction.onClick}>
            <contextualAction.icon className="h-4 w-4 mr-2" />
            {contextualAction.label}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="credits">💳 Credits Account</SplitBarTrigger>
            <SplitBarTrigger value="tokens">🪙 Tokens Account</SplitBarTrigger>
            <SplitBarTrigger value="membership">⭐ Membership Benefits</SplitBarTrigger>
            <SplitBarTrigger value="optimization">📈 Earning Optimization</SplitBarTrigger>
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
                  balance={getBalance('CREDITS') !== null ? `${getBalance('CREDITS')!.toLocaleString()} credits` : "Loading..."}
                  subBalance="Available: 100%"
                  change="+12.1%"
                  changeType="increase"
                  status="Active"
                  description="Use credits for health services, lab tests, and premium features"
                  isLoading={!isLoaded}
                />
                <WalletBalanceCard
                  type="credits"
                  title="Credits Status"
                  balance="Active"
                  description="Your credits are active and ready to use"
                  status="Healthy"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CreditEarningPredictionCard />
                <WalletMotivationalBanner 
                  variant="balance" 
                  activeTab="credits"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {loading && <div className="text-center py-4">Loading transactions...</div>}
                {transactions.filter(t => t.from_currency === 'CREDITS' || t.to_currency === 'CREDITS').slice(0, 5).map((transaction) => (
                  <WalletTransactionCard
                    key={transaction.id}
                    id={transaction.id}
                    type="reward"
                    title={`${transaction.transaction_type} Transaction`}
                    description={`${transaction.from_currency || ''} ${transaction.to_currency ? `→ ${transaction.to_currency}` : ''}`}
                    amount={`${transaction.amount > 0 ? '+' : ''}${transaction.amount}`}
                    status={transaction.status as any}
                    timestamp={new Date(transaction.created_at).toLocaleDateString()}
                    transaction={transaction}
                    currentUserId={user?.id}
                    onClick={() => console.log('Transaction clicked:', transaction.id)}
                  />
                ))}
                {!loading && transactions.filter(t => t.from_currency === 'CREDITS' || t.to_currency === 'CREDITS').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No credit transactions yet</div>
                )}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="tokens">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletBalanceCard
                  type="tokens"
                  title="VTNA Balance"
                  balance={getBalance('VTNA') !== null ? `${getBalance('VTNA')!.toLocaleString()} VTNA` : "Loading..."}
                  subBalance="Staked: 25%"
                  change="+5.7%"
                  changeType="increase"
                  status="Growing"
                  description="Vitana Network tokens for governance and rewards"
                  isLoading={!isLoaded}
                />
                <WalletBalanceCard
                  type="tokens"
                  title="Staking Rewards"
                  balance="45.50 VTNA"
                  description="Accumulated rewards from staking your VTNA tokens"
                  status="Claimable"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TokenMarketIntelligenceCard />
                <WalletMotivationalBanner 
                  variant="balance" 
                  activeTab="tokens"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {loading && <div className="text-center py-4">Loading transactions...</div>}
                {transactions.filter(t => t.from_currency === 'VTNA' || t.to_currency === 'VTNA').slice(0, 5).map((transaction) => (
                  <WalletTransactionCard
                    key={transaction.id}
                    id={transaction.id}
                    type="conversion"
                    title={`${transaction.transaction_type} Transaction`}
                    description={`${transaction.from_currency || ''} ${transaction.to_currency ? `→ ${transaction.to_currency}` : ''}`}
                    amount={`${transaction.amount > 0 ? '+' : ''}${transaction.amount}`}
                    status={transaction.status as any}
                    timestamp={new Date(transaction.created_at).toLocaleDateString()}
                    transaction={transaction}
                    currentUserId={user?.id}
                    onClick={() => console.log('Token transaction clicked:', transaction.id)}
                  />
                ))}
                {!loading && transactions.filter(t => t.from_currency === 'VTNA' || t.to_currency === 'VTNA').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No VTNA transactions yet</div>
                )}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="membership">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WalletBalanceCard
                  type="cash"
                  title="USD Balance"
                  balance={getBalance('USD') !== null ? `$${getBalance('USD')!.toLocaleString()}` : "Loading..."}
                  subBalance="Available: 100%"
                  change="+2.3%"
                  changeType="increase"
                  status="Active"
                  description="US Dollar holdings and fiat operations"
                  isLoading={!isLoaded}
                />
                <WalletBalanceCard
                  type="cash"
                  title="Membership Tier"
                  balance="Premium"
                  description="75% coverage + exclusive health benefits"
                  status="Active"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MembershipROIAnalyticsCard />
                <WalletMotivationalBanner 
                  variant="balance" 
                  activeTab="membership"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {loading && <div className="text-center py-4">Loading transactions...</div>}
                {transactions.filter(t => t.from_currency === 'USD' || t.to_currency === 'USD').slice(0, 5).map((transaction) => (
                  <WalletTransactionCard
                    key={transaction.id}
                    id={transaction.id}
                    type="purchase"
                    title={`${transaction.transaction_type} Transaction`}
                    description={`${transaction.from_currency || ''} ${transaction.to_currency ? `→ ${transaction.to_currency}` : ''}`}
                    amount={`${transaction.amount > 0 ? '+' : ''}$${Math.abs(transaction.amount)}`}
                    status={transaction.status as any}
                    timestamp={new Date(transaction.created_at).toLocaleDateString()}
                    transaction={transaction}
                    currentUserId={user?.id}
                    onClick={() => console.log('USD transaction clicked:', transaction.id)}
                  />
                ))}
                {!loading && transactions.filter(t => t.from_currency === 'USD' || t.to_currency === 'USD').length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No USD transactions yet</div>
                )}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="optimization">
            <EarningOptimizationSplitScreen />
          </SplitBarContent>
        </SplitBar>
        </div>
      </div>

      {/* Top Up Credits Dialog */}
      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Credits</DialogTitle>
            <DialogDescription>
              Purchase credits to unlock premium health services and features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col">
                <span className="text-lg font-bold">500</span>
                <span className="text-sm">$25</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <span className="text-lg font-bold">1,200</span>
                <span className="text-sm">$50</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <span className="text-lg font-bold">2,500</span>
                <span className="text-sm">$100</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <span className="text-lg font-bold">5,500</span>
                <span className="text-sm">$200</span>
              </Button>
            </div>
            <Button className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Credits
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy/Stake Tokens Dialog */}
      <Dialog open={isTokensOpen} onOpenChange={setIsTokensOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buy/Stake VTNA Tokens</DialogTitle>
            <DialogDescription>
              Purchase or stake VTNA tokens for governance and staking rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16">
                <Coins className="h-4 w-4 mr-2" />
                Buy Tokens
              </Button>
              <Button variant="outline" className="h-16">
                <Shield className="h-4 w-4 mr-2" />
                Stake Tokens
              </Button>
            </div>
            <Button className="w-full">
              Continue to Purchase
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Plan Dialog */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade Membership</DialogTitle>
            <DialogDescription>
              Upgrade to Platinum tier for 90% coverage and exclusive benefits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Platinum Tier</span>
                <span className="text-lg font-bold">$99/month</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 90% lab test coverage</li>
                <li>• Unlimited health coaching</li>
                <li>• Priority support 24/7</li>
                <li>• Advanced analytics</li>
              </ul>
            </div>
            <Button className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default withScreenId(Balance, SCREEN_IDS.WALLET_BALANCE);