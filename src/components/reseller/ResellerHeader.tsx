/**
 * RESELLER HEADER - KPI Cards
 * 
 * Premium glassy KPI cards for reseller dashboard.
 */

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Ticket, DollarSign, TrendingUp, Copy, Check } from "lucide-react";
import { useResellerEventStats, useResellerEvents } from "@/hooks/useResellerEvents";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

import { formatDate } from '@/lib/locale-format';
export function ResellerHeader() {
  const { data: profile } = useResellerProfile();
  const { data: events = [] } = useResellerEvents();
  const stats = useResellerEventStats();
  const [copied, setCopied] = useState(false);
  const { translate } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCopyCode = () => {
    if (profile?.reseller_code) {
      navigator.clipboard.writeText(profile.reseller_code);
      setCopied(true);
      toast.success(translate('business.reseller.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Find top performing event (highest gross revenue)
  const topEvent = events.reduce((best, event) => {
    if (!best || event.gross_revenue > best.gross_revenue) {
      return event;
    }
    return best;
  }, null as (typeof events)[0] | null);

  const cardBase = "bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: Upcoming Events + Reseller Code */}
      <div className={cardBase}>
        {/* Accent line */}
        <div className="h-0.5 bg-gradient-to-r from-primary to-primary/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.reseller.upcomingEvents')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.upcomingEventsCount}
              </p>
              {stats.nextEventDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {translate('business.reseller.next')}: {formatDate(new Date(stats.nextEventDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          {profile?.reseller_code && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40">
              <span className="text-xs text-muted-foreground">{translate('business.reseller.resellerCode')}</span>
              <button 
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="font-mono text-xs font-medium text-foreground">{profile.reseller_code}</span>
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

      {/* Card 2: Tickets Sold (30 days) */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Ticket className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.history.ticketsSold')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {stats.ticketsSold30Days}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translate('business.history.last30Days')}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 3: Revenue (30 days) */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-amber-500 to-amber-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.revenue')}</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(stats.revenue30Days)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{translate('business.history.last30Days')}</p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Card 4: Top Performing Event */}
      <div className={cardBase}>
        <div className="h-0.5 bg-gradient-to-r from-purple-500 to-fuchsia-500/50" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {topEvent?.image_url ? (
                <img 
                  src={topEvent.image_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium">{translate('business.kpi.topPerformer')}</p>
              {topEvent ? (
                <>
                  <p className="text-sm font-medium text-foreground truncate mt-1">
                    {topEvent.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {topEvent.tickets_sold} {translate('business.reseller.tickets')}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {formatCurrency(topEvent.gross_revenue)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-medium text-foreground">{translate('business.reseller.noSalesYet')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{translate('business.reseller.shareLinkToStart')}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
