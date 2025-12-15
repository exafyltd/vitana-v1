/**
 * EARNINGS HISTORY LEDGER
 * 
 * Unified chronological ledger of all earnings transactions.
 * Uses StandardHorizontalCard for consistent styling with Orders page.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet } from "lucide-react";
import { EarningsTransaction } from "@/hooks/useUnifiedEarnings";
import { StandardHorizontalCard, StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { cn } from "@/lib/utils";

interface EarningsHistoryLedgerProps {
  transactions: EarningsTransaction[];
  isLoading?: boolean;
}

type FilterType = "all" | "direct_sale" | "reseller_commission";

export function EarningsHistoryLedger({
  transactions,
  isLoading,
}: EarningsHistoryLedgerProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "direct_sale", label: "Direct Sales" },
    { value: "reseller_commission", label: "Reseller" },
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "direct_sale") {
      return tx.type === "ticket_sale" || tx.type === "direct_sale";
    }
    return tx.type === "reseller_commission";
  });

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

  const transformToCardProps = (tx: EarningsTransaction): StandardHorizontalCardProps => {
    const typeLabel = tx.type === "reseller_commission" ? "Reseller" : "Direct Sale";
    const dateInfo = format(new Date(tx.timestamp), "MMM d, yyyy • h:mm a");
    const txId = tx.id.slice(0, 8);
    
    const description = `${typeLabel} • ${dateInfo} • #${txId}`;
    
    // Status badge (single inline badge like Orders)
    const getStatusBadge = (): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
      if (tx.metadata?.status === "paid_to_wallet") {
        return { label: "Paid", variant: "secondary" };
      }
      return { label: "Pending", variant: "outline" };
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
        text: `${formatCurrency(tx.amount)} earned` 
      }],
      primaryAction: {
        label: "View",
        onClick: () => handleViewInWallet(tx),
        variant: "ghost",
        icon: <Wallet className="h-3.5 w-3.5" />,
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
          <p className="text-sm font-medium">No earnings history yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Start selling to see your transactions here
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
