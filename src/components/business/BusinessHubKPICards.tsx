/**
 * BUSINESS HUB KPI CARDS
 * 
 * Premium glassy KPI cards for business dashboard.
 * Mirrors ResellerHeader styling for visual consistency.
 */

import { CardContent } from "@/components/ui/card";
import { DollarSign, Users, Calendar, TrendingUp, Copy, Check } from "lucide-react";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useIsReseller } from "@/hooks/useIsReseller";
import { useState } from "react";
import { toast } from "sonner";

export function BusinessHubKPICards() {
  const { isReseller } = useIsReseller();
  const { data: resellerProfile } = useResellerProfile();
  const [copied, setCopied] = useState(false);

  // Mock data - in production, these would come from real hooks
  const stats = {
    revenue: 2450,
    activeClients: 147,
    upcomingSessions: 23,
    topPerformer: {
      title: "Personal Training",
      bookings: 45,
      revenue: 890
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCopyCode = () => {
    if (resellerProfile?.reseller_code) {
      navigator.clipboard.writeText(resellerProfile.reseller_code);
      setCopied(true);
      toast.success("Reseller code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardBase = "bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: Revenue (this month) + Reseller Code if applicable */}
      <div className={cardBase}>
        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">Revenue</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(stats.revenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </div>
          </div>
          {isReseller && resellerProfile?.reseller_code && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Reseller code</span>
              <button 
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-mono text-xs font-medium text-foreground">{resellerProfile.reseller_code}</span>
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          )}
        </CardContent>
      </div>

      {/* Card 2: Active Clients */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-blue-500 to-blue-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">Active Clients</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.activeClients}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total active</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 3: Upcoming Sessions */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-amber-500 to-amber-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">Upcoming Sessions</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.upcomingSessions}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This week</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 4: Top Performer */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">Top Performer</p>
              {stats.topPerformer ? (
                <>
                  <p className="text-sm font-medium text-foreground truncate mt-1">
                    {stats.topPerformer.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {stats.topPerformer.bookings} bookings
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {formatCurrency(stats.topPerformer.revenue)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-medium text-foreground">No data yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Create a service to get started.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
