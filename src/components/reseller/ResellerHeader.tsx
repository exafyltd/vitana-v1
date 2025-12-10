/**
 * RESELLER HEADER
 * 
 * Displays 4 KPI cards for the reseller/producer dashboard:
 * 1. Upcoming Events - count + next event date + reseller code
 * 2. Tickets Sold (30 days) - recent ticket sales
 * 3. Revenue (30 days) - recent earnings
 * 4. Top Performing Event - best selling event with metrics
 */

import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Ticket, DollarSign, TrendingUp } from "lucide-react";
import { useResellerEventStats, useResellerEvents } from "@/hooks/useResellerEvents";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { format } from "date-fns";

export function ResellerHeader() {
  const { data: profile } = useResellerProfile();
  const { data: events = [] } = useResellerEvents();
  const stats = useResellerEventStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Find top performing event (highest gross revenue)
  const topEvent = events.reduce((best, event) => {
    if (!best || event.gross_revenue > best.gross_revenue) {
      return event;
    }
    return best;
  }, null as (typeof events)[0] | null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Upcoming Events + Reseller Code */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Upcoming Events</h3>
              <p className="text-2xl font-bold text-primary">
                {stats.upcomingEventsCount}
              </p>
              {stats.nextEventDate && (
                <p className="text-xs text-muted-foreground">
                  Next: {format(new Date(stats.nextEventDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
          {profile?.reseller_code && (
            <div className="mt-3 pt-3 border-t border-primary/20">
              <p className="text-xs text-muted-foreground">Your reseller code</p>
              <p className="font-mono font-semibold text-primary">{profile.reseller_code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Tickets Sold (30 days) */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Tickets Sold</h3>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.ticketsSold30Days}
              </p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Revenue (30 days) */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Revenue</h3>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(stats.revenue30Days)}
              </p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Top Performing Event */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center overflow-hidden">
              {topEvent?.image_url ? (
                <img 
                  src={topEvent.image_url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <TrendingUp className="h-5 w-5 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Top Performer</h3>
              {topEvent ? (
                <>
                  <p className="text-sm font-medium text-purple-600 truncate">
                    {topEvent.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {topEvent.tickets_sold} tickets • {formatCurrency(topEvent.gross_revenue)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No events yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
