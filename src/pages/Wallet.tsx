import { useState } from "react";
import { Plus, CreditCard, Coins, ArrowUpRight, Eye, DollarSign, Shield, Send, ArrowUpDown } from "lucide-react";
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
import { StakeTokensPopup } from "@/components/wallet/popups/StakeTokensPopup";
import { AddFundsPopup } from "@/components/wallet/popups/AddFundsPopup";
import { BuyCreditsPopup } from "@/components/wallet/popups/BuyCreditsPopup";
import { BuyTokensPopup } from "@/components/wallet/popups/BuyTokensPopup";
import { WithdrawPopup } from "@/components/wallet/popups/WithdrawPopup";
import PaymentRequestPopup from "@/components/payment/PaymentRequestPopup";
import MakePaymentPopup from "@/components/payment/MakePaymentPopup";
import ExchangeAndSendPopup from "@/components/payment/ExchangeAndSendPopup";
import { CrossSystemNotifier } from "@/components/notifications/CrossSystemNotifier";
import { WalletBalanceCard } from "@/components/wallet/WalletBalanceCard";
import { WalletTransactionCard } from "@/components/wallet/WalletTransactionCard";
import { NewsCard } from "@/components/crossover/NewsCard";
import { SmartEarningsForecastCard } from "@/components/wallet/intelligence/SmartEarningsForecastCard";
import { IntelligentSpendingCard } from "@/components/wallet/intelligence/IntelligentSpendingCard";
import { PredictiveActionsCard } from "@/components/wallet/intelligence/PredictiveActionsCard";
import { DynamicRewardOpportunityCard } from "@/components/wallet/intelligence/DynamicRewardOpportunityCard";
import { walletNavigation } from "@/config/navigation";
import { useWallet } from "@/hooks/useWallet";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';

// Mock data has been removed - quickActionsData is defined later in the file

const quickActionsData = [
  {
    title: "Buy Credits - Special Offer 💰",
    description: "Get 25% bonus credits on your next purchase of $50+",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Finance",
    author: { name: "VITANA Store", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Limited Time",
    rewardPoints: 10,
    rewardDescription: "Earn credits for completing purchase"
  },
  {
    title: "Transfer to Friend 🤝",
    description: "Send credits or cash to another VITANA member instantly",
    imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Social",
    author: { name: "Transfer Service", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Available 24/7",
    rewardPoints: 5,
    rewardDescription: "Earn credits for social sharing"
  },
  {
    title: "Convert Rewards 🔄",
    description: "Turn your earned rewards into spendable credits automatically",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
    category: "achievement" as const,
    pillar: "Rewards",
    author: { name: "Rewards Engine", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    timestamp: "Instant Conversion",
    rewardPoints: 3,
    rewardDescription: "Earn credits for conversion feedback"
  }
];

export default function Wallet() {
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [exchangeStep, setExchangeStep] = useState<'menu' | 'exchange'>('menu');
  const [selectedCurrencyForExchange, setSelectedCurrencyForExchange] = useState<'USD' | 'VTN' | 'CREDITS' | undefined>();
  const [stakeTokensOpen, setStakeTokensOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [makePaymentOpen, setMakePaymentOpen] = useState(false);
  const [exchangeAndSendOpen, setExchangeAndSendOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [activeTab, setActiveTab] = useState("balance-overview");
  const { balances, transactions, loading, error, getBalance, isLoaded } = useWallet();

  // Handle opening specific wallet actions
  const handleWalletAction = (actionType: string, currency?: string) => {
    switch (actionType) {
      case 'stake-tokens':
        setStakeTokensOpen(true);
        break;
      case 'add-funds':
        setAddFundsOpen(true);
        break;
      case 'buy-credits':
        setBuyCreditsOpen(true);
        break;
      case 'buy-tokens':
        setBuyTokensOpen(true);
        break;
      case 'withdraw':
        setWithdrawOpen(true);
        break;
      case 'send':
        setSelectedCurrency(currency || '');
        setMakePaymentOpen(true);
        break;
      case 'request':
        setSelectedCurrency(currency || '');
        setPaymentRequestOpen(true);
        break;
      case 'exchange':
        // Exchange-only: open master action popup directly to exchange step
        setSelectedCurrency(currency || '');
        setSelectedCurrencyForExchange(currency as 'USD' | 'VTN' | 'CREDITS');
        setExchangeStep('exchange');
        setMasterActionOpen(true);
        break;
      case 'exchange-and-send':
        // Combined exchange & send functionality
        setSelectedCurrency(currency || '');
        setExchangeAndSendOpen(true);
        break;
      default:
        setMasterActionOpen(true);
        break;
    }
  };

  return (
    <AppLayout>
      <SEO title="Vitana Wallet | VITANA" description="Your digital bank account for health rewards and benefits" canonical={window.location.href} />
      <SubNavigation items={walletNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
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
          <UniversalCalendarButton />
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
              {/* Row 1: All Account Balance Cards */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-4">
                  <WalletBalanceCard
                    type="tokens"
                    title="VTN Tokens"
                    balance={getBalance('VTN') !== null ? `${getBalance('VTN')!.toLocaleString()} VTN` : "Loading..."}
                    subBalance="Staked: 25%"
                    change="+5.7%"
                    changeType="increase"
                    status="Growing"
                    description="Vitana Network Tokens for governance and staking rewards"
                    className="h-full"
                    isLoading={!isLoaded}
                    primaryAction={{
                      label: "Stake Tokens",
                      onClick: () => handleWalletAction('stake-tokens'),
                      icon: Coins,
                      variant: "default"
                    }}
                    secondaryActions={[
                      {
                        label: "Buy Tokens",
                        onClick: () => handleWalletAction('buy-tokens', 'VTN'),
                        icon: Coins
                      },
                      {
                        label: "Send",
                        onClick: () => handleWalletAction('send', 'VTN'),
                        icon: Send
                      },
                      {
                        label: "Request",
                        onClick: () => handleWalletAction('request', 'VTN'),
                        icon: CreditCard
                      },
                      {
                        label: "Exchange",
                        onClick: () => handleWalletAction('exchange', 'VTN'),
                        icon: ArrowUpDown
                      }
                    ]}
                  />
                </div>
                <div className="col-span-4">
                  <WalletBalanceCard
                    type="cash"
                    title="USD Balance"
                    balance={getBalance('USD') !== null ? `$${getBalance('USD')!.toLocaleString()}` : "Loading..."}
                    subBalance="Available: 100%"
                    change="+2.3%"
                    changeType="increase"
                    status="Active"
                    description="US Dollar balance for instant purchases, withdrawals and secure transactions"
                    className="h-full"
                    isLoading={!isLoaded}
                    primaryAction={{
                      label: "Add Funds",
                      onClick: () => handleWalletAction('add-funds'),
                      icon: DollarSign,
                      variant: "default"
                    }}
                    secondaryActions={[
                      {
                        label: "Send",
                        onClick: () => handleWalletAction('send', 'USD'),
                        icon: Send
                      },
                      {
                        label: "Request",
                        onClick: () => handleWalletAction('request', 'USD'),
                        icon: CreditCard
                      },
                      {
                        label: "Exchange",
                        onClick: () => handleWalletAction('exchange', 'USD'),
                        icon: ArrowUpDown
                      },
                      {
                        label: "Withdraw",
                        onClick: () => handleWalletAction('withdraw'),
                        icon: ArrowUpRight
                      }
                    ]}
                  />
                </div>
                <div className="col-span-4">
                  <WalletBalanceCard
                    type="credits"
                    title="Credits Balance"
                    balance={getBalance('CREDITS') !== null ? `${getBalance('CREDITS')!.toLocaleString()} Credits` : "Loading..."}
                    subBalance="Available: 100%"
                    change="+12.1%"
                    changeType="increase"
                    status="Active"
                    description="Platform credits for seamless transactions, rewards and premium features"
                    className="h-full"
                    isLoading={!isLoaded}
                    primaryAction={{
                      label: "Buy Credits",
                      onClick: () => handleWalletAction('buy-credits'),
                      icon: CreditCard,
                      variant: "default"
                    }}
                    secondaryActions={[
                      {
                        label: "Send",
                        onClick: () => handleWalletAction('send', 'CREDITS'),
                        icon: Send
                      },
                      {
                        label: "Request",
                        onClick: () => handleWalletAction('request', 'CREDITS'),
                        icon: CreditCard
                      },
                      {
                        label: "Exchange",
                        onClick: () => handleWalletAction('exchange', 'CREDITS'),
                        icon: ArrowUpDown
                      },
                      {
                        label: "Spend Credits",
                        onClick: () => handleWalletAction('spend-credits'),
                        icon: ArrowUpRight
                      }
                    ]}
                  />
                </div>
              </div>

              <WalletMotivationalBanner variant="overview" />

              {/* Row 2: Smart Earnings Forecast */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-12">
                  <SmartEarningsForecastCard className="h-full" />
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
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Loading transactions...
                    </div>
                  ) : transactions.length > 0 ? (
                    <WalletTransactionCard
                      id={transactions[0].id}
                      type="reward"
                      title={`${transactions[0].transaction_type} Transaction`}
                      description={`${transactions[0].from_currency || ''} ${transactions[0].to_currency ? `→ ${transactions[0].to_currency}` : ''}`}
                      amount={`${transactions[0].amount > 0 ? '+' : ''}${transactions[0].amount}`}
                      status={transactions[0].status as any}
                      timestamp={new Date(transactions[0].created_at).toLocaleDateString()}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No transactions yet
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Loading transactions...
                    </div>
                  ) : transactions.length > 1 ? (
                    <WalletTransactionCard
                      id={transactions[1].id}
                      type="incoming"
                      title={`${transactions[1].transaction_type} Transaction`}
                      description={`${transactions[1].from_currency || ''} ${transactions[1].to_currency ? `→ ${transactions[1].to_currency}` : ''}`}
                      amount={`${transactions[1].amount > 0 ? '+' : ''}${transactions[1].amount}`}
                      status={transactions[1].status as any}
                      timestamp={new Date(transactions[1].created_at).toLocaleDateString()}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No additional transactions
                    </div>
                  )}
                </div>
              </div>

              <WalletMotivationalBanner variant="overview" />

              {/* Row 2: More Transactions */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                {transactions.slice(2, 5).map((transaction, index) => (
                  <div key={transaction.id} className="col-span-4">
                    <WalletTransactionCard
                      id={transaction.id}
                      type="conversion"
                      title={`${transaction.transaction_type} Transaction`}
                      description={`${transaction.from_currency || ''} ${transaction.to_currency ? `→ ${transaction.to_currency}` : ''}`}
                      amount={`${transaction.amount > 0 ? '+' : ''}${transaction.amount}`}
                      status={transaction.status as any}
                      timestamp={new Date(transaction.created_at).toLocaleDateString()}
                      className="h-full"
                    />
                  </div>
                ))}
                {transactions.length < 5 && (
                  Array.from({ length: 3 - Math.max(0, transactions.length - 2) }).map((_, index) => (
                    <div key={`empty-${index}`} className="col-span-4">
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No additional transactions
                      </div>
                    </div>
                  ))
                )}
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
                    rewardPoints={quickActionsData[0].rewardPoints}
                    rewardDescription={quickActionsData[0].rewardDescription}
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
                    rewardPoints={quickActionsData[1].rewardPoints}
                    rewardDescription={quickActionsData[1].rewardDescription}
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
                    rewardPoints={quickActionsData[2].rewardPoints}
                    rewardDescription={quickActionsData[2].rewardDescription}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </SplitBarContent>
        </SplitBar>

        <WalletMasterActionPopup 
          open={masterActionOpen}
          onOpenChange={(open) => {
            setMasterActionOpen(open);
            if (!open) {
              setExchangeStep('menu');
              setSelectedCurrencyForExchange(undefined);
            }
          }}
          initialStep={exchangeStep}
          selectedCurrency={selectedCurrencyForExchange}
        />

        <StakeTokensPopup 
          open={stakeTokensOpen}
          onOpenChange={setStakeTokensOpen}
        />

        <AddFundsPopup 
          open={addFundsOpen}
          onOpenChange={setAddFundsOpen}
        />

        <BuyCreditsPopup 
          open={buyCreditsOpen}
          onOpenChange={setBuyCreditsOpen}
        />

        <BuyTokensPopup 
          open={buyTokensOpen}
          onOpenChange={setBuyTokensOpen}
        />

        <WithdrawPopup 
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
        />

        <PaymentRequestPopup
          isOpen={paymentRequestOpen}
          onClose={() => setPaymentRequestOpen(false)}
          initialAmount=""
          initialDescription=""
        />

        <MakePaymentPopup 
          isOpen={makePaymentOpen}
          onClose={() => setMakePaymentOpen(false)}
        />

        <ExchangeAndSendPopup 
          isOpen={exchangeAndSendOpen}
          onClose={() => setExchangeAndSendOpen(false)}
        />
        
        {/* Cross-system notification handler */}
        <CrossSystemNotifier />
        </div>
      </div>
    </AppLayout>
  );
}