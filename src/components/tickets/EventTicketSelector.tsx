import React, { useState, useCallback, useEffect } from "react";
import { Ticket, Minus, Plus, Loader2, AlertCircle, Gift, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventTicketTypes, usePurchaseTicket, TicketType, UtmParams } from "@/hooks/useEventTickets";
import { useDiscountCode } from "@/hooks/useDiscountCode";
import DiscountCodeInput from "@/components/tickets/DiscountCodeInput";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

interface EventTicketSelectorProps {
  eventId: string;
  eventTitle: string;
  forceGuestMode?: boolean;
  utmParams?: UtmParams;
  eventPrice?: number;
  onSelectionChange?: (hasSelection: boolean) => void;
}

export function EventTicketSelector({ eventId, eventTitle, forceGuestMode = false, utmParams, eventPrice, onSelectionChange }: EventTicketSelectorProps) {
  const { ticketTypes, loading, error } = useEventTicketTypes(eventId);
  const { purchaseTicket, loading: purchasing } = usePurchaseTicket();
  const { discountCode, loading: discountLoading, clearDiscount } = useDiscountCode('maxina');
  const { translate } = useTranslation();
  
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(forceGuestMode);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedPercent, setAppliedPercent] = useState<number>(0);

  const updateQuantity = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const newQty = Math.max(0, Math.min(10, current + delta));
      if (newQty === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newQty };
    });
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);

  useEffect(() => {
    onSelectionChange?.(totalTickets > 0);
  }, [totalTickets, onSelectionChange]);
  const totalAmount = ticketTypes.reduce((sum, tt) => {
    const qty = selectedTickets[tt.id] || 0;
    return sum + tt.price * qty;
  }, 0);
  const discountedTotal = appliedCode ? totalAmount * (1 - appliedPercent / 100) : totalAmount;

  const validateCode = useCallback(async (code: string): Promise<{ valid: boolean; message?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { valid: false, message: translate('discount.invalid') };

      const { data, error } = await (supabase as any)
        .from("user_discount_codes")
        .select("id, code, discount_percent, tenant_slug, expires_at, used_at")
        .eq("code", code)
        .eq("tenant_slug", "maxina")
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return { valid: false, message: translate('discount.invalid') };
      }

      setAppliedCode(data.code);
      setAppliedPercent(data.discount_percent);
      return { valid: true };
    } catch {
      return { valid: false, message: translate('discount.invalid') };
    }
  }, [translate]);

  const handleApplyAutoCode = async () => {
    if (!discountCode) return;
    const result = await validateCode(discountCode.code);
    if (!result.valid) {
      // Auto-detected code failed validation — ignore silently
    }
  };

  const handleClearCode = () => {
    setAppliedCode(null);
    setAppliedPercent(0);
  };

  const handlePurchase = async () => {
    const firstSelectedId = Object.keys(selectedTickets).find(
      (id) => selectedTickets[id] > 0
    );
    if (!firstSelectedId) return;

    try {
      await purchaseTicket(
        eventId,
        firstSelectedId,
        selectedTickets[firstSelectedId],
        showGuestForm ? guestEmail : undefined,
        showGuestForm ? guestName : undefined,
        utmParams,
        appliedCode || undefined
      );

      // Clear discount UI after successful checkout
      if (appliedCode) {
        setAppliedCode(null);
        setAppliedPercent(0);
        clearDiscount();
      }
    } catch {
      // Purchase failed — keep discount state intact
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive py-4">
        <AlertCircle className="h-5 w-5" />
        <span>{translate('discount.loadFailed', 'Failed to load tickets')}</span>
      </div>
    );
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <Ticket className="h-12 w-12 mx-auto text-muted-foreground/30" />
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">{translate('discount.ticketsComing', 'Tickets coming soon')}</p>
          <p className="text-sm text-muted-foreground/70">
            {eventPrice && eventPrice > 0
              ? translate('discount.contactOrganizerPrice', `This event costs $${eventPrice}. Contact the organizer for ticket availability.`).replace('{price}', String(eventPrice))
              : translate('discount.contactOrganizer', 'Contact the event organizer for ticket information.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!forceGuestMode && (
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          {translate('eventCta.getTickets', 'Get Tickets')}
        </h3>
      )}

      {/* Auto-detected discount banner */}
      {!discountLoading && discountCode && !appliedCode && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-pink-50 to-violet-50 border border-pink-200 dark:from-pink-950/30 dark:to-violet-950/30 dark:border-pink-800">
          <Gift className="h-5 w-5 text-pink-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {translate('discount.bannerAvailable', 'Welcome discount available')}
            </p>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono text-pink-600 dark:text-pink-400">{discountCode.code}</code>
              {' '}({discountCode.discount_percent}%)
            </p>
          </div>
          <Button size="xs" variant="soft" onClick={handleApplyAutoCode}>
            {translate('discount.tapToApply', 'Apply')}
          </Button>
        </div>
      )}

      {/* Applied discount badge */}
      {appliedCode && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-400 font-medium flex-1">
            {translate('discount.discountAppliedAmount', '{percent}% discount applied').replace('{percent}', String(appliedPercent))}
            {' '}<code className="font-mono">{appliedCode}</code>
          </span>
          <button onClick={handleClearCode} className="text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Ticket Types */}
      <div className="space-y-3">
        {ticketTypes.map((ticketType) => (
          <TicketTypeCard
            key={ticketType.id}
            ticketType={ticketType}
            quantity={selectedTickets[ticketType.id] || 0}
            onQuantityChange={(delta) => updateQuantity(ticketType.id, delta)}
            discountPercent={appliedCode ? appliedPercent : 0}
          />
        ))}
      </div>

      {/* Manual discount code entry */}
      {!appliedCode && (
        <DiscountCodeInput onApply={validateCode} appliedCode={appliedCode} onClear={handleClearCode} />
      )}

      {/* Guest Checkout Form */}
      {totalTickets > 0 && (
        <div className="space-y-4 pt-4 border-t">
          {!forceGuestMode && (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShowGuestForm(!showGuestForm)}
            >
              {showGuestForm ? translate('discount.useAccountEmail', 'Use my account email') : translate('discount.buyAsGuest', 'Buy as guest (no account)')}
            </button>
          )}

          {showGuestForm && (
            <div className="space-y-3">
              {forceGuestMode && (
                <p className="text-sm text-muted-foreground">
                  {translate('discount.guestDetails', 'Enter your details to receive your ticket. No account required.')}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">{translate('discount.fullName', 'Full Name')}</Label>
                <Input
                  id="guest-name"
                  placeholder="John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest-email">{translate('discount.email', 'Email')}</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="john@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {translate('discount.ticketEmailNote', 'Your ticket and confirmation will be sent to this email.')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary & Purchase */}
      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {translate('discount.ticketsSelected', '{count} ticket(s) selected').replace('{count}', String(totalTickets))}
          </span>
          <span className="font-semibold text-foreground">
            {totalTickets === 0 ? "$0.00" : totalAmount === 0 ? translate('discount.free', 'Free') : (
              appliedCode && discountedTotal !== totalAmount ? (
                <>
                  <span className="line-through text-muted-foreground mr-2">${totalAmount.toFixed(2)}</span>
                  <span className="text-green-600">${discountedTotal.toFixed(2)}</span>
                </>
              ) : `$${totalAmount.toFixed(2)}`
            )}
          </span>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePurchase}
          disabled={totalTickets === 0 || purchasing || (showGuestForm && (!guestEmail || !guestName))}
        >
          {purchasing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {translate('eventCta.processing', 'Processing...')}
            </>
          ) : totalTickets === 0 ? (
            translate('eventCta.selectTickets', 'Select Tickets')
          ) : totalAmount === 0 ? (
            translate('eventCta.getFreeTicket', 'Get Free Ticket')
          ) : (
            translate('eventCta.buyTicketsTotal', `Buy Tickets – $${totalAmount.toFixed(2)}`).replace('{total}', `$${(appliedCode ? discountedTotal : totalAmount).toFixed(2)}`)
          )}
        </Button>
      </div>
    </div>
  );
}

interface TicketTypeCardProps {
  ticketType: TicketType;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  discountPercent?: number;
}

function TicketTypeCard({ ticketType, quantity, onQuantityChange, discountPercent = 0 }: TicketTypeCardProps) {
  const { translate } = useTranslation();
  const available = ticketType.quantity_available - ticketType.quantity_sold;
  const isSoldOut = available <= 0;
  const isLowStock = available > 0 && available <= 10;

  const now = new Date();
  const saleNotStarted = ticketType.sale_start_date && new Date(ticketType.sale_start_date) > now;
  const saleEnded = ticketType.sale_end_date && new Date(ticketType.sale_end_date) < now;

  const discountedPrice = discountPercent > 0 ? ticketType.price * (1 - discountPercent / 100) : ticketType.price;

  return (
    <Card className={`p-4 ${isSoldOut || saleNotStarted || saleEnded ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{ticketType.name}</h4>
            {isSoldOut && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                {translate('discount.soldOut', 'Sold Out')}
              </span>
            )}
            {isLowStock && !isSoldOut && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                {translate('discount.left', '{count} left').replace('{count}', String(available))}
              </span>
            )}
          </div>
          
          {ticketType.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticketType.description}
            </p>
          )}

          {saleNotStarted && ticketType.sale_start_date && (
            <p className="text-xs text-muted-foreground">
              {translate('discount.salesStart', 'Sales start {date}').replace('{date}', format(new Date(ticketType.sale_start_date), "MMM d, h:mm a"))}
            </p>
          )}

          {saleEnded && (
            <p className="text-xs text-destructive">{translate('discount.salesEnded', 'Sales ended')}</p>
          )}

          <div className="flex items-center gap-2">
            {discountPercent > 0 && ticketType.price > 0 ? (
              <>
                <span className="text-sm line-through text-muted-foreground">${ticketType.price.toFixed(2)}</span>
                <span className="text-lg font-semibold text-green-600">${discountedPrice.toFixed(2)}</span>
              </>
            ) : (
              <span className="text-lg font-semibold text-primary">
                {ticketType.price === 0 ? translate('discount.free', 'Free') : `$${ticketType.price.toFixed(2)}`}
              </span>
            )}
          </div>
        </div>

        {!isSoldOut && !saleNotStarted && !saleEnded && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(-1)}
              disabled={quantity === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(1)}
              disabled={quantity >= Math.min(10, available)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
