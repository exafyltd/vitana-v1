/**
 * TOP PERFORMER CARD
 * 
 * Displays the top performing event/offering based on earnings.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Ticket, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from '@/lib/i18n-toast';

interface TopPerformerCardProps {
  name: string;
  type: "event" | "service";
  revenue: number;
  ticketsSold?: number;
  isLoading?: boolean;
}

export function TopPerformerCard({
  name,
  type,
  revenue,
  ticketsSold,
  isLoading,
}: TopPerformerCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-EU", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="bg-card/70 backdrop-blur-sm border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!name) {
    return (
      <Card className="bg-card/70 backdrop-blur-sm border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('screens.business.noTopPerformerYet')}</p>
              <p className="text-xs text-muted-foreground/70">
                {t('screens.business.startSellingSeeYourBestPerformer')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
                {t('screens.business.topPerformer')}
              </p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {type === "event" ? (
                  <Calendar className="h-2.5 w-2.5 mr-1" />
                ) : null}
                {type}
              </Badge>
            </div>
            <p className="font-medium text-foreground truncate">{name}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatCurrency(revenue)}
              </span>
              {ticketsSold !== undefined && (
                <span className="flex items-center gap-1">
                  <Ticket className="h-3 w-3" />{t('screens.business.ticketssoldTickets', { ticketsSold })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
