import { format } from "date-fns";
import { MapPin, Monitor, ArrowRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface MobileInventoryCardProps {
  id: string;
  imageUrl: string | null;
  title: string;
  startTime: Date;
  eventType: 'in-person' | 'online';
  commissionRate: number;
  ticketPrice: number;
  earningPerTicket: number;
  resaleScope: 'public' | 'tenant';
  quantity?: number;
  onSell: () => void;
}

export function MobileInventoryCard({
  imageUrl,
  title,
  startTime,
  eventType,
  commissionRate,
  ticketPrice,
  earningPerTicket,
  resaleScope,
  quantity = 10,
  onSell,
}: MobileInventoryCardProps) {
  const formattedDate = format(startTime, "MMM d · HH:mm");
  const earningFormatted = earningPerTicket > 0 
    ? `€${earningPerTicket % 1 === 0 ? earningPerTicket : earningPerTicket.toFixed(2)}`
    : null;
  const potentialTotal = earningPerTicket * quantity;
  const potentialFormatted = potentialTotal > 0
    ? `€${potentialTotal % 1 === 0 ? potentialTotal : potentialTotal.toFixed(2)}`
    : null;
  const priceFormatted = ticketPrice > 0
    ? `€${ticketPrice % 1 === 0 ? ticketPrice : ticketPrice.toFixed(2)}`
    : null;

  return (
    <div className="rounded-xl border bg-card/80 backdrop-blur shadow-sm p-3 space-y-2.5 active:scale-[0.98] transition-all">
      {/* Meta line (top) */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {eventType === 'in-person' ? (
          <MapPin className="h-3 w-3" />
        ) : (
          <Monitor className="h-3 w-3" />
        )}
        <span>
          {eventType === 'in-person' ? 'In-person' : 'Online'}
          {commissionRate > 0 && ` · ${commissionRate}% commission`}
        </span>
      </div>

      {/* Main row: 2-column grid */}
      <div className="grid grid-cols-[56px_1fr] gap-3 items-start">
        {/* Thumbnail */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-14 h-14 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Ticket className="h-6 w-6 text-accent" />
          </div>
        )}

        {/* Content + Action cluster */}
        <div className="flex items-start justify-between gap-2 min-w-0">
          {/* Left: Title + Date */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formattedDate}
            </p>
          </div>

          {/* Right: Action cluster */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Earnings badge */}
            {earningFormatted && (
              <div className="inline-flex flex-col items-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t('screens.reseller.earnEarningformatted', { earningFormatted })}</span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                  {t('screens.reseller.ticket')}
                </span>
              </div>
            )}

            {/* Sell CTA */}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSell();
              }}
              className="h-9 px-4 rounded-full font-medium gap-1.5"
            >{t('screens.reseller.sell')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>

            {/* Optional: Potential total */}
            {potentialFormatted && (
              <span className="text-[10px] text-muted-foreground">{t('screens.reseller.potentialPotentialformatted', { potentialFormatted })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom meta (optional) */}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t pt-2 mt-1">
        <span>{resaleScope === 'tenant' ? 'This community' : 'Public'}</span>
        {quantity > 0 && (
          <>
            <span>·</span>
            <span>{t('screens.reseller.qtyQuantity', { quantity })}</span>
          </>
        )}
        {priceFormatted && (
          <>
            <span>·</span>
            <span>{t('screens.reseller.pricePriceformatted', { priceFormatted })}</span>
          </>
        )}
      </div>
    </div>
  );
}
