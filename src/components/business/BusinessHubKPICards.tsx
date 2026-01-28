/**
 * BUSINESS HUB KPI CARDS
 * 
 * Premium glassy KPI cards for business dashboard.
 * Mirrors ResellerHeader styling for visual consistency.
 */

import { CardContent } from "@/components/ui/card";
import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function BusinessHubKPICards() {
  const { translate } = useTranslation();
  
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

  const cardBase = "relative bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: Revenue (this month) */}
      <div className={cardBase}>
        {/* Subtle gradient wash */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-emerald-500/[0.07] to-transparent pointer-events-none" />
        {/* Accent line */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-500/40" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.revenue')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(stats.revenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translate('business.kpi.thisMonth')}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 2: Active Clients */}
      <div className={cardBase}>
        {/* Subtle gradient wash */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-blue-500/[0.07] to-transparent pointer-events-none" />
        <div className="h-[2px] bg-gradient-to-r from-blue-500 to-blue-500/40" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.activeClients')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.activeClients}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translate('business.kpi.totalActive')}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 3: Upcoming Sessions */}
      <div className={cardBase}>
        {/* Subtle gradient wash */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-500/[0.06] to-transparent pointer-events-none" />
        <div className="h-[2px] bg-gradient-to-r from-amber-500 to-amber-500/40" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.upcomingSessions')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.upcomingSessions}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translate('business.kpi.thisWeek')}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 4: Top Performer */}
      <div className={cardBase}>
        {/* Subtle gradient wash */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-violet-500/[0.06] to-transparent pointer-events-none" />
        <div className="h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500/40" />
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.topPerformer')}</p>
              {stats.topPerformer ? (
                <>
                  <p className="text-sm font-medium text-foreground truncate mt-1">
                    {stats.topPerformer.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {stats.topPerformer.bookings} {translate('business.kpi.bookings')}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {formatCurrency(stats.topPerformer.revenue)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-medium text-foreground">{translate('business.kpi.noDataYet')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{translate('business.kpi.createServiceToStart')}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
