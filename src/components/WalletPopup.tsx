import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { 
  Wallet,
  TrendingUp, 
  TrendingDown,
  ChevronRight, 
  Settings, 
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Database,
  Shield,
  ExternalLink,
  Plus,
  Download,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { useWallet } from "@/hooks/useWallet";
import PaymentRequestPopup from "@/components/payment/PaymentRequestPopup";
import MakePaymentPopup from "@/components/payment/MakePaymentPopup";
import CreditTransferPopup from "@/components/payment/CreditTransferPopup";
import ExchangeAndSendPopup from "@/components/payment/ExchangeAndSendPopup";
import { ExchangeRateDisplay } from "@/components/wallet/ExchangeRateDisplay";
import { QuickExchangeWidget } from "@/components/wallet/QuickExchangeWidget";
import { notify, t } from '@/lib/i18n-toast';

interface Transaction {
  id: string;
  type: 'earned' | 'redeemed' | 'bonus';
  amount: number;
  description: string;
  date: string;
  source: string;
}

interface WalletPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'earned',
    amount: 50,
    description: 'Daily Health Check-in',
    date: 'Today',
    source: 'Health Tracker'
  },
  {
    id: '2',
    type: 'earned',
    amount: 125,
    description: 'Workout Session Completed',
    date: 'Yesterday',
    source: 'Fitness App'
  },
  {
    id: '3',
    type: 'redeemed',
    amount: -200,
    description: 'Premium Health Consultation',
    date: '2 days ago',
    source: 'Healthcare'
  }
];

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'earned':
    case 'bonus':
      return <ArrowUpRight className="h-3 w-3 text-green-500" />;
    case 'redeemed':
      return <ArrowDownLeft className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
};

const getTransactionColor = (type: Transaction['type']) => {
  switch (type) {
    case 'earned':
    case 'bonus':
      return 'text-green-600';
    case 'redeemed':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
};

export function WalletPopup({ open, onOpenChange }: WalletPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [showMakePayment, setShowMakePayment] = useState(false);
  const [showCreditTransfer, setShowCreditTransfer] = useState(false);
  const [showExchangeAndSend, setShowExchangeAndSend] = useState(false);
  
  const { balances, loading, getBalance, exchangeCurrency } = useWallet();
  
  const currentBalance = getBalance('VTNA') || 0;
  const usdBalance = getBalance('USD') || 0;
  const creditsBalance = getBalance('CREDITS') || 0;
  const pendingRewards = 156;
  const monthlyTrend = 12.5; // percentage increase
  
  const handleViewFullWallet = () => {
    onOpenChange(false);
    navigate('/wallet');
  };
  
  const handleRedeem = () => {
    notify('toasts.common.redeemPoints', 'toasts.common.redemptionOptionsOpeningSoon');
  };

  const handleExportData = () => {
    notify('toasts.common.exportData', 'toasts.common.preparingYourDataExport');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-green-500" />
            </div>
            <span>{t('screens.common.digitalWallet')}</span>
            <Badge variant="outline" className="ml-auto text-green-600 border-green-200">
              {loading ? '...' : currentBalance.toLocaleString()} VTNA
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Your health data rewards and digital assets
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Exchange Rates */}
            <ExchangeRateDisplay compact={true} />
            
            {/* Balance Overview */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-green-600">
                    {loading ? '...' : currentBalance.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('screens.common.vtnaBalance')}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">+{monthlyTrend}%</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {pendingRewards}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Gift className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-blue-600">Rewards</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Exchange Widget */}
            <QuickExchangeWidget 
              onExchange={async (fromAmount, fromCurrency, toCurrency, toAmount) => {
                try {
                  const exchangeRate = toAmount / fromAmount;
                  await exchangeCurrency(
                    fromCurrency as 'USD' | 'VTNA' | 'CREDITS',
                    toCurrency as 'USD' | 'VTNA' | 'CREDITS',
                    fromAmount,
                    exchangeRate
                  );
                } catch (error) {
                  // Error handled in useWallet hook
                }
              }}
              onExchangeAndSend={() => setShowExchangeAndSend(true)}
            />

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="ghost" size="sm" className="flex-col h-auto p-2" onClick={() => setShowPaymentRequest(true)}>
                    <Gift className="h-4 w-4 mb-1" />
                    <span className="text-xs">Request</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-col h-auto p-2" onClick={() => setShowCreditTransfer(true)}>
                    <Database className="h-4 w-4 mb-1" />
                    <span className="text-xs">Transfer</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-col h-auto p-2">
                    <Shield className="h-4 w-4 mb-1" />
                    <span className="text-xs">Consent</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t('screens.common.recentTransactions')}</p>
                <Badge variant="outline" className="text-xs">
                  Last {mockTransactions.length}
                </Badge>
              </div>
              
              {mockTransactions.map((transaction) => (
                <Card key={transaction.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{transaction.source}</span>
                          <span>•</span>
                          <span>{transaction.date}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={cn("text-sm font-medium", getTransactionColor(transaction.type))}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} VTNA
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Health Data Monetization */}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t('screens.common.dataMonetization')}</p>
              <Card className="border-dashed">
                <CardContent className="p-3 text-center">
                  <Database className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-2">
                    Share health data for rewards
                  </p>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" />
                    Browse Packages
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowPaymentRequest(true)}>
              <Gift className="h-4 w-4 mr-2" />
              Request
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowMakePayment(true)}>
              <Send className="h-4 w-4 mr-2" />
              Pay
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreditTransfer(true)}>
              <Download className="h-4 w-4 mr-2" />
              Transfer
            </Button>
          </div>
          <Button onClick={handleViewFullWallet} className="w-full sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Wallet
          </Button>
        </DialogFooter>
        
        {/* Payment Request Popup */}
        <PaymentRequestPopup
          isOpen={showPaymentRequest}
          onClose={() => setShowPaymentRequest(false)}
          paymentType="transfer"
        />
        
        {/* Make Payment Popup */}
        <MakePaymentPopup
          isOpen={showMakePayment}
          onClose={() => setShowMakePayment(false)}
          paymentType="transfer"
        />
        
        {/* Credit Transfer Popup */}
        <CreditTransferPopup
          isOpen={showCreditTransfer}
          onClose={() => setShowCreditTransfer(false)}
          currentBalance={currentBalance}
        />
        
        {/* Exchange And Send Popup */}
        <ExchangeAndSendPopup
          isOpen={showExchangeAndSend}
          onClose={() => setShowExchangeAndSend(false)}
        />
      </DialogContent>
    </Dialog>
  );
}