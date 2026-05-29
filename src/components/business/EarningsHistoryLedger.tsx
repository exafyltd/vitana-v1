/**
 * EARNINGS HISTORY LEDGER
 * 
 * Unified chronological ledger of all earnings transactions.
 * Uses StandardHorizontalCard for consistent styling with Orders page.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { subDays, isAfter } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, X } from "lucide-react";
import { EarningsTransaction } from "@/hooks/useUnifiedEarnings";
import { StandardHorizontalCard, StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface EarningsHistoryLedgerProps {
  transactions: EarningsTransaction[];
  isLoading?: boolean;
  dateRange?: string | null;
}

type FilterType = "all" | "direct_sale" | "reseller_commission";

export function EarningsHistoryLedger({
  transactions,
  isLoading,
  dateRange,
}: EarningsHistoryLedgerProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { translate } = useTranslation();

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: translate('business.history.all') },
    { value: "direct_sale", label: translate('business.history.directSales') },
    { value: "reseller_commission", label: translate('business.history.reseller') },
  ];

  // Apply date range filter
  const dateFilteredTransactions = useMemo(() => {
    if (!dateRange) return transactions;
    
    const now = new Date();
    let cutoffDate: Date;
    
    switch (dateRange) {
      case "30d":
        cutoffDate = subDays(now, 30);
        break;
      case "7d":
        cutoffDate = subDays(now, 7);
        break;
      case "90d":
        cutoffDate = subDays(now, 90);
        break;
      default:
        return transactions;
    }
    
    return transactions.filter(tx => isAfter(new Date(tx.timestamp), cutoffDate));
  }, [transactions, dateRange]);

  const filteredTransactions = dateFilteredTransactions.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "direct_sale") {
      return tx.type === "ticket_sale" || tx.type === "direct_sale";
    }
    return tx.type === "reseller_commission";
  });
  
  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case "30d": return translate('business.history.last30Days');
      case "7d": return translate('business.history.last7Days');
      case "90d": return translate('business.history.last90Days');
      default: return range;
    }
  };
  
  const clearDateRange = () => {
    navigate("/business?tab=history");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewInWallet = (tx: EarningsTransaction) => {
    const filterParam = tx.type === "reseller_commission" ? "reseller_commission" : "ticket_sale";
    navigate(`/wallet?filter=${filterParam}`);
  };

  const renderExpandedContent = (tx: EarningsTransaction) => {
    const isPaid = tx.metadata?.status === "paid_to_wallet";
    const ticketsSold = tx.metadata?.ticketsSold || 1;
    const grossAmount = tx.metadata?.grossAmount || tx.amount;
    
    return (
      <div className="space-y-4 py-2">
        {/* Transaction Summary Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{translate('business.history.ticketsSold')}</span>
            <p className="font-medium">{ticketsSold}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{translate('business.history.grossAmount')}</span>
            <p className="font-medium">{formatCurrency(grossAmount)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{translate('business.history.youEarned')}</span>
            <p className="font-semibold text-emerald-600">{formatCurrency(tx.amount)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{translate('tableHeaders.status')}</span>
            <Badge variant={isPaid ? "secondary" : "outline"}>
              {isPaid ? translate('business.history.paidToWallet') : translate('business.history.pendingPayout')}
            </Badge>
          </div>
        </div>
        
        {/* Wallet Link Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {translate('business.history.transactionId')}: #{tx.id.slice(0, 12)}
          </span>
          <Button 
            variant="link" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              handleViewInWallet(tx);
            }}
            className="text-xs h-auto p-0"
          >
            <Wallet className="h-3 w-3 mr-1" />
            {translate('business.history.viewInWallet')}
          </Button>
        </div>
      </div>
    );
  };

  const transformToCardProps = (tx: EarningsTransaction): StandardHorizontalCardProps => {
    const typeLabel = tx.type === "reseller_commission" ? translate('business.history.reseller') : translate('business.history.directSales');
    const dateInfo = formatDate(new Date(tx.timestamp), "MMM d, yyyy • h:mm a");
    const txId = tx.id.slice(0, 8);
    
    const description = `${typeLabel} • ${dateInfo} • #${txId}`;
    
    // Status badge (single inline badge like Orders)
    const getStatusBadge = (): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
      if (tx.metadata?.status === "paid_to_wallet") {
        return { label: translate('business.history.paidToWallet'), variant: "secondary" };
      }
      return { label: translate('business.history.pendingPayout'), variant: "outline" };
    };
    
    return {
      id: tx.id,
      screenId: "BUSINESS_HISTORY",
      icon: (
        <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center text-lg">
          {tx.type === "reseller_commission" ? "🎫" : "📅"}
        </div>
      ),
      title: tx.title,
      description,
      badges: [getStatusBadge()],
      metadata: [{ 
        icon: null, 
        text: `${formatCurrency(tx.amount)} ${translate('business.history.youEarned').toLowerCase()}` 
      }],
      // Expansion props - clicking card expands it
      expandedContent: renderExpandedContent(tx),
      isExpanded: expandedId === tx.id,
      onToggleExpand: handleToggleExpand,
      // Visual indicator for expandable
      primaryAction: {
        label: expandedId === tx.id ? translate('common.close') : translate('business.history.details'),
        onClick: () => handleToggleExpand(tx.id),
        variant: "ghost",
        icon: <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          expandedId === tx.id && "rotate-180"
        )} />,
      },
      layoutMode: "stack",
      density: "compact",
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-1 p-1 bg-card/40 backdrop-blur-xl rounded-xl border border-border/20 w-fit">
          {filters.map((f) => (
            <Skeleton key={f.value} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-background/60 backdrop-blur-sm rounded-xl border border-white/10">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active date range chip */}
      {dateRange && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2">
            <span>{getDateRangeLabel(dateRange)}</span>
            <button 
              onClick={clearDateRange}
              className="ml-1 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
          <span className="text-sm text-muted-foreground">{t('screens.business.lengthTransactionValue1', { length: filteredTransactions.length, value1: filteredTransactions.length !== 1 ? "s" : "" })}</span>
        </div>
      )}
      
      {/* Filter chips - segmented control style */}
      <div className="flex gap-1 p-1 bg-card/40 backdrop-blur-xl rounded-xl border border-border/20 w-fit">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
              filter === f.value 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">{translate('business.history.noEarningsYet')}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {translate('business.history.startSellingToSee')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <StandardHorizontalCard
              key={tx.id}
              {...transformToCardProps(tx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
