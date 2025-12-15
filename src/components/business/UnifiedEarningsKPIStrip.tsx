/**
 * UNIFIED EARNINGS KPI STRIP
 * 
 * Horizontal 4-card KPI display for Business Hub Overview.
 * Shows: Total Earnings, Earnings (30 days), Pending, In Wallet
 */

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UnifiedEarningsKPIStripProps {
  totalEarnings: number;
  earnings30Days: number;
  pendingPayout: number;
  inWallet: number;
  isLoading?: boolean;
}

export function UnifiedEarningsKPIStrip({
  totalEarnings,
  earnings30Days,
  pendingPayout,
  inWallet,
  isLoading,
}: UnifiedEarningsKPIStripProps) {
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/40">
          {/* Total Earnings - Accent Styling */}
          <div className="p-4 flex items-center gap-3 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent/80 to-accent/40" />
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Total Earnings</p>
              <p className="text-2xl font-semibold tracking-tight text-accent">
                {isLoading ? "..." : formatCurrency(totalEarnings)}
              </p>
            </div>
          </div>

          {/* Earnings 30 Days */}
          <div className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Earnings (30 days)</p>
              <p className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? "..." : formatCurrency(earnings30Days)}
              </p>
            </div>
          </div>

          {/* Pending Payout */}
          <div className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Pending Payout</p>
              <p className="text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
                {isLoading ? "..." : formatCurrency(pendingPayout)}
              </p>
            </div>
          </div>

          {/* In Wallet */}
          <div 
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/wallet")}
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">In Wallet</p>
              <p className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading ? "..." : formatCurrency(inWallet)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
