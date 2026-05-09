import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Gift, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { t } from '@/lib/i18n-toast';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  from_currency?: string;
  to_currency?: string;
  status: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

interface MobileWalletTransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onTransactionClick?: (transaction: Transaction) => void;
  maxItems?: number;
  showHeader?: boolean;
  className?: string;
}

export function MobileWalletTransactionList({
  transactions,
  isLoading = false,
  onTransactionClick,
  maxItems = 5,
  showHeader = true,
  className = ""
}: MobileWalletTransactionListProps) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'send':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'receive':
      case 'incoming':
      case 'reseller_commission':
        return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
      case 'exchange':
      case 'conversion':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'reward':
        return <Gift className="h-4 w-4 text-purple-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionIconBg = (type: string) => {
    switch (type) {
      case 'transfer':
      case 'send':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'receive':
      case 'incoming':
      case 'reseller_commission':
        return 'bg-emerald-100 dark:bg-emerald-900/30';
      case 'exchange':
      case 'conversion':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'reward':
        return 'bg-purple-100 dark:bg-purple-900/30';
      default:
        return 'bg-muted';
    }
  };

  const formatTransactionTitle = (tx: Transaction) => {
    switch (tx.transaction_type) {
      case 'reseller_commission':
        return 'Commission Earned';
      case 'transfer':
        return 'Transfer';
      case 'exchange':
        return 'Exchange';
      case 'reward':
        return 'Reward';
      case 'purchase':
        return 'Purchase';
      default:
        return tx.transaction_type.charAt(0).toUpperCase() + tx.transaction_type.slice(1);
    }
  };

  const formatAmount = (tx: Transaction) => {
    const prefix = tx.amount > 0 ? '+' : '';
    return `${prefix}${tx.amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'pending':
        return 'text-amber-600 dark:text-amber-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('screens.wallet.recentActivity')}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : "p-4"}>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayTransactions = transactions.slice(0, maxItems);

  if (displayTransactions.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('screens.wallet.recentActivity')}</CardTitle>
          </CardHeader>
        )}
        <CardContent className={showHeader ? "pt-0" : "p-4"}>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">{t('screens.wallet.noTransactionsYet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('screens.wallet.recentActivity')}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-0" : "p-4"}>
        <div className="space-y-1">
          {displayTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 py-3 cursor-pointer active:bg-muted/50 rounded-lg -mx-2 px-2 transition-colors"
              onClick={() => onTransactionClick?.(tx)}
            >
              {/* Icon */}
              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getTransactionIconBg(tx.transaction_type)}`}>
                {getTransactionIcon(tx.transaction_type)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{formatTransactionTitle(tx)}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(tx.created_at), 'MMM d, h:mm a')}
                  {tx.status !== 'completed' && (
                    <span className={`ml-2 ${getStatusColor(tx.status)}`}>
                      • {tx.status}
                    </span>
                  )}
                </p>
              </div>
              
              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {formatAmount(tx)}
                </p>
                {tx.from_currency && (
                  <p className="text-xs text-muted-foreground">{tx.from_currency}</p>
                )}
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
