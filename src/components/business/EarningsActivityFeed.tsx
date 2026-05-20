/**
 * EARNINGS ACTIVITY FEED
 * 
 * Ledger-style feed of earnings transactions with filters.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Ticket, ChevronRight, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import type { EarningsTransaction } from "@/hooks/useUnifiedEarnings";

import { formatDistanceToNow } from '@/lib/locale-format';
type FilterType = "all" | "direct" | "reseller";

interface EarningsActivityFeedProps {
  transactions: EarningsTransaction[];
  isLoading?: boolean;
}

export function EarningsActivityFeed({ transactions, isLoading }: EarningsActivityFeedProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const { translate } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    if (filter === "direct") return tx.type === "ticket_sale" || tx.type === "direct_sale";
    if (filter === "reseller") return tx.type === "reseller_commission";
    return true;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "reseller_commission":
        return <Award className="h-4 w-4 text-accent" />;
      case "ticket_sale":
      case "direct_sale":
        return <Ticket className="h-4 w-4 text-emerald-600" />;
      default:
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: translate('business.history.all') },
    { value: "direct", label: translate('business.history.directSales') },
    { value: "reseller", label: translate('business.history.reseller') },
  ];

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{translate('business.history.earningsActivity')}</CardTitle>
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-auto p-0"
            onClick={() => navigate("/wallet")}
          >
            {translate('business.history.viewInWallet')}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Filter Chips */}
        <div className="flex gap-2 pt-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                filter === option.value
                  ? "bg-accent/10 text-accent border border-accent/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {translate('loading.default')}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {translate('business.history.noEarningsStartSelling')}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                  {getTransactionIcon(tx.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{tx.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {tx.source}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                  </p>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
