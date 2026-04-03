import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, CreditCard, Coins, ArrowUpRight, Eye, DollarSign, Shield, Send, ArrowUpDown, X, Sparkles, Plane } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { MobileModePill, ModeOption } from "@/components/ui/MobileModePill";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletMasterActionPopup } from "@/components/wallet/WalletMasterActionPopup";
import { PopupCoordinationWrapper } from "@/components/payment/PopupCoordinationWrapper";
import { usePopupCoordination } from "@/hooks/usePopupCoordination";
import { StakeTokensPopup } from "@/components/wallet/popups/StakeTokensPopup";
import { AddFundsPopup } from "@/components/wallet/popups/AddFundsPopup";
import { BuyCreditsPopup } from "@/components/wallet/popups/BuyCreditsPopup";
import { BuyTokensPopup } from "@/components/wallet/popups/BuyTokensPopup";
import { WithdrawPopup } from "@/components/wallet/popups/WithdrawPopup";
import { SpendCreditsPopup } from "@/components/wallet/popups/SpendCreditsPopup";
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
import { useAuth } from "@/context/AuthProvider";
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { MobileWalletBalanceCard } from "@/components/wallet/mobile/MobileWalletBalanceCard";
import { MobileWalletTransactionList } from "@/components/wallet/mobile/MobileWalletTransactionList";
import { MobileWalletQuickActions } from "@/components/wallet/mobile/MobileWalletQuickActions";
import { useTranslation } from "@/hooks/useTranslation";
import { isIAPRestricted } from "@/lib/appilix";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { translate } = useTranslation();
  const filterType = searchParams.get("filter"); // e.g., "reseller_commission"
  
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [exchangeStep, setExchangeStep] = useState<'menu' | 'exchange'>('menu');
  const [selectedCurrencyForExchange, setSelectedCurrencyForExchange] = useState<'USD' | 'VTNA' | 'CREDITS' | undefined>();
  const [stakeTokensOpen, setStakeTokensOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [spendCreditsOpen, setSpendCreditsOpen] = useState(false);
  const [paymentRequestOpen, setPaymentRequestOpen] = useState(false);
  const [makePaymentOpen, setMakePaymentOpen] = useState(false);
  const [exchangeAndSendOpen, setExchangeAndSendOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [activeTab, setActiveTab] = useState("balance-overview");
  const [mobileWalletMode, setMobileWalletMode] = useState("balances");

  const mobileWalletModes: ModeOption[] = [
    { value: 'balances', label: translate('wallet.tabs.balances', 'Balances'), icon: '💰' },
    { value: 'activity', label: translate('wallet.tabs.activity', 'Activity'), icon: '📊' },
    { value: 'actions', label: translate('wallet.tabs.actions', 'Actions'), icon: '⚡' },
  ];
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const { balances, transactions, loading, error, getBalance, isLoaded } = useWallet();
  const { user } = useAuth();
  const { requestPopup, clearPopup } = usePopupCoordination();
  const { logActivity } = useActivityLogger();
  const { pendingCount } = useAutopilot();

  // Auto-switch to Recent Activity tab when filter is active
  useEffect(() => {
    if (filterType) {
      setActiveTab("recent-activity");
    }
  }, [filterType]);

  // Filter transactions based on URL filter param
  const filteredTransactions = useMemo(() => {
    if (!filterType) return transactions;
    
    // Handle "pending" filter for pending payouts
    if (filterType === "pending") {
      return transactions.filter(tx => 
        tx.status === "pending" || 
        (tx.metadata as Record<string, unknown>)?.status === "pending_payout"
      );
    }
    
    return transactions.filter(tx => tx.transaction_type === filterType);
  }, [transactions, filterType]);

  // Clear filter
  const clearFilter = () => {
    setSearchParams({});
  };

  // Get filter display label
  const getFilterLabel = (filter: string) => {
    switch (filter) {
      case "reseller_commission":
        return translate('wallet.filters.commissions');
      case "transfer":
        return translate('wallet.filters.transfers');
      case "exchange":
        return translate('wallet.filters.exchanges');
      case "reward":
        return translate('wallet.filters.rewards');
      case "purchase":
        return translate('wallet.filters.purchases');
      case "pending":
        return translate('wallet.filters.pending');
      default:
        return filter;
    }
  };

  // Handle opening specific wallet actions
  const handleWalletAction = async (actionType: string, currency?: string) => {
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
      case 'spend-credits':
        setSpendCreditsOpen(true);
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
        const exchangeSuccess = await requestPopup('wallet-master');
        if (exchangeSuccess) {
          setSelectedCurrency(currency || '');
          setSelectedCurrencyForExchange(currency as 'USD' | 'VTNA' | 'CREDITS');
          setExchangeStep('exchange');
          setMasterActionOpen(true);
        }
        break;
      case 'exchange-and-send':
        // Combined exchange & send functionality
        const exchangeSendSuccess = await requestPopup('wallet-master');
        if (exchangeSendSuccess) {
          setSelectedCurrency(currency || '');
          setExchangeAndSendOpen(true);
        }
        break;
      default:
        const defaultSuccess = await requestPopup('wallet-master');
        if (defaultSuccess) {
          setMasterActionOpen(true);
        }
        break;
    }
  };

  // Mobile wallet popup components (shared with desktop)
  const renderPopups = () => (
    <>
      <PopupCoordinationWrapper
        popupType="wallet-master"
        isOpen={masterActionOpen}
        onClose={() => {
          setMasterActionOpen(false);
          clearPopup('wallet-master');
          setExchangeStep('menu');
          setSelectedCurrencyForExchange(undefined);
        }}
      >
        <WalletMasterActionPopup 
          open={masterActionOpen}
          onOpenChange={(open) => {
            setMasterActionOpen(open);
            if (!open) {
              clearPopup('wallet-master');
              setExchangeStep('menu');
              setSelectedCurrencyForExchange(undefined);
            }
          }}
          initialStep={exchangeStep}
          selectedCurrency={selectedCurrencyForExchange}
        />
      </PopupCoordinationWrapper>

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

      <SpendCreditsPopup 
        open={spendCreditsOpen}
        onOpenChange={setSpendCreditsOpen}
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
      
      <AutopilotPopup 
        open={autopilotOpen} 
        onOpenChange={setAutopilotOpen} 
      />
      
      {/* Cross-system notification handler */}
      <CrossSystemNotifier />
    </>
  );

  // Mobile Layout - matches Events/BusinessHub pattern
  if (isMobile) {
    return (
      <AppLayout>
        <SEO title={`${translate('wallet.title')} | VITANA`} description={translate('wallet.description')} canonical={window.location.href} />
        
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-primary/5 to-background">
          <div className="p-4 pb-32 space-y-4">
            {/* StandardHeader - same pattern as Events/LiveRooms/MediaHub/BusinessHub */}
            <StandardHeader
              title={translate('wallet.title')}
              description={translate('wallet.description')}
            />
            
            {/* Action Rail - same pattern */}
            <UtilityActionButton 
              className="min-w-0"
              afterGiftVoucherChildren={
                <>
                  {/* Vitana Index - pill style */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/health')}
                    className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
                  >
                    <span className="text-xs opacity-60">🧬</span>
                    <span className="text-sm font-medium text-primary">742</span>
                  </Button>
                  
                  {/* Autopilot - pill style with label */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAutopilotOpen(true)}
                    className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 relative shrink-0"
                  >
                    <Plane className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{translate('actionBar.autopilot', 'Autopilot')}</span>
                    {pendingCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                </>
              }
            >
              <div className="flex items-center gap-2 min-w-max">
                <ExpandableSearchButton 
                  placeholder={translate('wallet.searchWallet')}
                  onSearch={(query) => console.log('Search:', query)}
                />
                <UniversalCalendarButton />
                
                {/* Wallet Actions button - primary action */}
                <Button 
                  onClick={() => setMasterActionOpen(true)}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">{translate('common.actions')}</span>
                </Button>
              </div>
            </UtilityActionButton>
            
            {/* Mobile Tabs - consolidated SplitBar */}
            <SplitBar defaultValue="balances" className="w-full">
              <SplitBarList>
                <SplitBarTrigger value="balances">{translate('wallet.tabs.balances')}</SplitBarTrigger>
                <SplitBarTrigger value="activity">{translate('wallet.tabs.activity')}</SplitBarTrigger>
                <SplitBarTrigger value="actions">{translate('wallet.tabs.actions')}</SplitBarTrigger>
              </SplitBarList>
              
              {/* Balances Tab - Simplified balance cards */}
              <SplitBarContent value="balances" className="space-y-3 pt-3">
                {/* Balance Cards - vertical stack */}
                <MobileWalletBalanceCard
                  type="cash"
                  title={translate('wallet.usdBalance')}
                  balance={getBalance('USD') !== null ? `$${getBalance('USD')!.toLocaleString()}` : "Loading..."}
                  subBalance="Available: 100%"
                  change="+2.3%"
                  changeType="increase"
                  isLoading={!isLoaded}
                  onPress={isIAPRestricted() ? undefined : () => handleWalletAction('add-funds')}
                />
                
                <MobileWalletBalanceCard
                  type="credits"
                  title={translate('wallet.creditsBalance')}
                  balance={getBalance('CREDITS') !== null ? `${getBalance('CREDITS')!.toLocaleString()} Credits` : translate('common.loading')}
                  subBalance={`${translate('wallet.available')}: 100%`}
                  change="+12.1%"
                  changeType="increase"
                  isLoading={!isLoaded}
                  onPress={isIAPRestricted() ? undefined : () => handleWalletAction('buy-credits')}
                />
                
                <MobileWalletBalanceCard
                  type="tokens"
                  title={translate('wallet.vtnaTokens')}
                  balance={getBalance('VTNA') !== null ? `${getBalance('VTNA')!.toLocaleString()} VTNA` : translate('common.loading')}
                  subBalance={`${translate('wallet.staked')}: 25%`}
                  change="+5.7%"
                  changeType="increase"
                  isLoading={!isLoaded}
                  onPress={isIAPRestricted() ? undefined : () => handleWalletAction('stake-tokens')}
                />
                
                {/* Quick Actions Card */}
                <MobileWalletQuickActions
                  onAddFunds={() => handleWalletAction('add-funds')}
                  onSend={() => handleWalletAction('send', 'USD')}
                  onExchange={() => handleWalletAction('exchange', 'USD')}
                  onWithdraw={() => handleWalletAction('withdraw')}
                  onBuyCredits={() => handleWalletAction('buy-credits')}
                  onStakeTokens={() => handleWalletAction('stake-tokens')}
                  className="mt-4"
                />
              </SplitBarContent>
              
              {/* Activity Tab - Transaction list */}
              <SplitBarContent value="activity" className="space-y-3 pt-3">
                {/* Filter Chip */}
                {filterType && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span className="text-xs">Showing: {getFilterLabel(filterType)}</span>
                      <button 
                        onClick={clearFilter}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  </div>
                )}
                
                <MobileWalletTransactionList
                  transactions={filteredTransactions}
                  isLoading={loading}
                  maxItems={10}
                  showHeader={true}
                />
              </SplitBarContent>
              
              {/* Actions Tab - Smart actions & opportunities */}
              <SplitBarContent value="actions" className="space-y-4 pt-3">
                <PredictiveActionsCard className="w-full" />
                <DynamicRewardOpportunityCard className="w-full" />
              </SplitBarContent>
            </SplitBar>
          </div>
        </div>
        
        {renderPopups()}
      </AppLayout>
    );
  }

  // Desktop Layout (unchanged)
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
            <SplitBarTrigger value="balance-overview">💰 Balance Overview</SplitBarTrigger>
            <SplitBarTrigger value="recent-activity">📊 Recent Activity</SplitBarTrigger>
            <SplitBarTrigger value="quick-actions">⚡ Smart Actions</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="balance-overview">
            <div className="mt-6">
              {/* Row 1: All Account Balance Cards */}
              <div className="grid grid-cols-12 gap-4 mb-8" style={{ minHeight: '280px' }}>
                <div className="col-span-4">
                  <WalletBalanceCard
                    type="tokens"
                    title="VTNA Tokens"
                    balance={getBalance('VTNA') !== null ? `${getBalance('VTNA')!.toLocaleString()} VTNA` : "Loading..."}
                    subBalance="Staked: 25%"
                    change="+5.7%"
                    changeType="increase"
                    status="Growing"
                    description="Vitana Network Tokens for governance and staking rewards"
                    className="h-full"
                    isLoading={!isLoaded}
                    primaryAction={isIAPRestricted() ? undefined : {
                      label: "Stake Tokens",
                      onClick: () => handleWalletAction('stake-tokens'),
                      icon: Coins,
                      variant: "default"
                    }}
                    secondaryActions={[
                      ...(isIAPRestricted() ? [] : [{
                        label: "Buy Tokens",
                        onClick: () => handleWalletAction('buy-tokens', 'VTNA'),
                        icon: Coins
                      }]),
                      {
                        label: "Send",
                        onClick: () => handleWalletAction('send', 'VTNA'),
                        icon: Send
                      },
                      {
                        label: "Request",
                        onClick: () => handleWalletAction('request', 'VTNA'),
                        icon: CreditCard
                      },
                      {
                        label: "Exchange",
                        onClick: () => handleWalletAction('exchange', 'VTNA'),
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
                    primaryAction={isIAPRestricted() ? undefined : {
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
                    primaryAction={isIAPRestricted() ? undefined : {
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
              {/* Filter Chip */}
              {filterType && (
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span>Showing: {getFilterLabel(filterType)}</span>
                    <button 
                      onClick={clearFilter}
                      className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

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
                  ) : filteredTransactions.length > 0 ? (
                    <WalletTransactionCard
                      id={filteredTransactions[0].id}
                      type={filteredTransactions[0].transaction_type === "reseller_commission" ? "incoming" : "reward"}
                      title={filteredTransactions[0].transaction_type === "reseller_commission" 
                        ? "Reseller Commission" 
                        : `${filteredTransactions[0].transaction_type} Transaction`}
                      description={filteredTransactions[0].transaction_type === "reseller_commission"
                        ? "Sell & Earn · Payout"
                        : `${filteredTransactions[0].from_currency || ''} ${filteredTransactions[0].to_currency ? `→ ${filteredTransactions[0].to_currency}` : ''}`}
                      amount={`${filteredTransactions[0].amount > 0 ? '+' : ''}${filteredTransactions[0].amount}`}
                      status={filteredTransactions[0].status as any}
                      timestamp={new Date(filteredTransactions[0].created_at).toLocaleDateString()}
                      transaction={filteredTransactions[0]}
                      currentUserId={user?.id}
                      className="h-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      {filterType ? "No matching transactions" : "No transactions yet"}
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  {loading ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Loading transactions...
                    </div>
                  ) : filteredTransactions.length > 1 ? (
                    <WalletTransactionCard
                      id={filteredTransactions[1].id}
                      type={filteredTransactions[1].transaction_type === "reseller_commission" ? "incoming" : "incoming"}
                      title={filteredTransactions[1].transaction_type === "reseller_commission" 
                        ? "Reseller Commission" 
                        : `${filteredTransactions[1].transaction_type} Transaction`}
                      description={filteredTransactions[1].transaction_type === "reseller_commission"
                        ? "Sell & Earn · Payout"
                        : `${filteredTransactions[1].from_currency || ''} ${filteredTransactions[1].to_currency ? `→ ${filteredTransactions[1].to_currency}` : ''}`}
                      amount={`${filteredTransactions[1].amount > 0 ? '+' : ''}${filteredTransactions[1].amount}`}
                      status={filteredTransactions[1].status as any}
                      timestamp={new Date(filteredTransactions[1].created_at).toLocaleDateString()}
                      transaction={filteredTransactions[1]}
                      currentUserId={user?.id}
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
                {filteredTransactions.slice(2, 5).map((transaction, index) => (
                  <div key={transaction.id} className="col-span-4">
                    <WalletTransactionCard
                      id={transaction.id}
                      type={transaction.transaction_type === "reseller_commission" ? "incoming" : "conversion"}
                      title={transaction.transaction_type === "reseller_commission" 
                        ? "Reseller Commission" 
                        : `${transaction.transaction_type} Transaction`}
                      description={transaction.transaction_type === "reseller_commission"
                        ? "Sell & Earn · Payout"
                        : `${transaction.from_currency || ''} ${transaction.to_currency ? `→ ${transaction.to_currency}` : ''}`}
                      amount={`${transaction.amount > 0 ? '+' : ''}${transaction.amount}`}
                      status={transaction.status as any}
                      timestamp={new Date(transaction.created_at).toLocaleDateString()}
                      transaction={transaction}
                      currentUserId={user?.id}
                      className="h-full"
                    />
                  </div>
                ))}
                {filteredTransactions.length < 5 && (
                  Array.from({ length: 3 - Math.max(0, filteredTransactions.length - 2) }).map((_, index) => (
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

              {/* Row 2: Traditional Quick Actions — hidden on iOS (no digital purchases) */}
              {!isIAPRestricted() && (
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
              )}
            </div>
          </SplitBarContent>
        </SplitBar>

        {renderPopups()}
        </div>
      </div>
    </AppLayout>
  );
}