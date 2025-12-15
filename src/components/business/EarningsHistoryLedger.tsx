/**
 * EARNINGS HISTORY LEDGER
 * 
 * Unified chronological ledger of all earnings transactions.
 * Displays full-width horizontal cards with transaction details.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket, Calendar, ArrowRight, Wallet, Clock } from "lucide-react";
import { EarningsTransaction } from "@/hooks/useUnifiedEarnings";

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

  const getSourceBadge = (type: EarningsTransaction["type"]) => {
    if (type === "reseller_commission") {
      return (
        <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground border-accent/30">
          Reseller
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        Direct sale
      </Badge>
    );
  };

  const getStatusBadge = (status?: string) => {
    if (status === "paid_to_wallet") {
      return (
        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
          Paid to wallet
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
        <Clock className="h-2.5 w-2.5 mr-1" />
        Pending payout
      </Badge>
    );
  };

  const handleViewInWallet = (tx: EarningsTransaction) => {
    const filterParam = tx.type === "reseller_commission" ? "reseller_commission" : "ticket_sale";
    navigate(`/wallet?filter=${filterParam}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {filters.map((f) => (
            <Skeleton key={f.value} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-card/70 rounded-xl border border-border/40">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
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
      {/* Filter chips */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
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
            <div
              key={tx.id}
              className="p-4 bg-card/70 backdrop-blur-sm rounded-xl border border-border/40 hover:border-border/60 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  {tx.type === "reseller_commission" ? (
                    <Ticket className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {tx.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tx.metadata?.ticketsSold || 1} ticket{(tx.metadata?.ticketsSold || 1) > 1 ? "s" : ""} · {formatCurrency(tx.metadata?.grossAmount || tx.amount)} gross · {formatCurrency(tx.amount)} earned
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs gap-1"
                      onClick={() => handleViewInWallet(tx)}
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Badges and timestamp */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {getSourceBadge(tx.type)}
                      {getStatusBadge(tx.metadata?.status)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(tx.timestamp), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
