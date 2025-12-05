import React, { useState } from "react";
import { Ticket, Minus, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventTicketTypes, usePurchaseTicket, TicketType } from "@/hooks/useEventTickets";
import { format } from "date-fns";

interface EventTicketSelectorProps {
  eventId: string;
  eventTitle: string;
  /** Force guest checkout mode (for public pages where user is not logged in) */
  forceGuestMode?: boolean;
}

export function EventTicketSelector({ eventId, eventTitle, forceGuestMode = false }: EventTicketSelectorProps) {
  const { ticketTypes, loading, error } = useEventTicketTypes(eventId);
  const { purchaseTicket, loading: purchasing } = usePurchaseTicket();
  
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  // Start with guest form visible if forceGuestMode is true
  const [showGuestForm, setShowGuestForm] = useState(forceGuestMode);

  const updateQuantity = (ticketId: string, delta: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const newQty = Math.max(0, Math.min(10, current + delta)); // Max 10 per type
      if (newQty === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newQty };
    });
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalAmount = ticketTypes.reduce((sum, tt) => {
    const qty = selectedTickets[tt.id] || 0;
    return sum + tt.price * qty;
  }, 0);

  const handlePurchase = async () => {
    // Find the first selected ticket type
    const firstSelectedId = Object.keys(selectedTickets).find(
      (id) => selectedTickets[id] > 0
    );
    
    if (!firstSelectedId) return;

    // For simplicity, purchase first selected type
    // In production, you might want to handle multiple ticket types
    await purchaseTicket(
      eventId,
      firstSelectedId,
      selectedTickets[firstSelectedId],
      showGuestForm ? guestEmail : undefined,
      showGuestForm ? guestName : undefined
    );
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
        <span>Failed to load tickets</span>
      </div>
    );
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>No tickets available for this event</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!forceGuestMode && (
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Get Tickets
        </h3>
      )}

      {/* Ticket Types */}
      <div className="space-y-3">
        {ticketTypes.map((ticketType) => (
          <TicketTypeCard
            key={ticketType.id}
            ticketType={ticketType}
            quantity={selectedTickets[ticketType.id] || 0}
            onQuantityChange={(delta) => updateQuantity(ticketType.id, delta)}
          />
        ))}
      </div>

      {/* Guest Checkout Form */}
      {totalTickets > 0 && (
        <div className="space-y-4 pt-4 border-t">
          {/* Only show toggle if not forced into guest mode */}
          {!forceGuestMode && (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setShowGuestForm(!showGuestForm)}
            >
              {showGuestForm ? "Use my account email" : "Buy as guest (no account)"}
            </button>
          )}

          {showGuestForm && (
            <div className="space-y-3">
              {forceGuestMode && (
                <p className="text-sm text-muted-foreground">
                  Enter your details to receive your ticket. No account required.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">Full Name</Label>
                <Input
                  id="guest-name"
                  placeholder="John Doe"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest-email">Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  placeholder="john@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your ticket and confirmation will be sent to this email.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary & Purchase */}
      {totalTickets > 0 && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
            </span>
            <span className="font-semibold text-foreground">
              {totalAmount === 0 ? "Free" : `$${totalAmount.toFixed(2)}`}
            </span>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePurchase}
            disabled={purchasing || (showGuestForm && (!guestEmail || !guestName))}
          >
            {purchasing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {totalAmount === 0 ? "Get Free Ticket" : `Buy Tickets - $${totalAmount.toFixed(2)}`}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface TicketTypeCardProps {
  ticketType: TicketType;
  quantity: number;
  onQuantityChange: (delta: number) => void;
}

function TicketTypeCard({ ticketType, quantity, onQuantityChange }: TicketTypeCardProps) {
  const available = ticketType.quantity_available - ticketType.quantity_sold;
  const isSoldOut = available <= 0;
  const isLowStock = available > 0 && available <= 10;

  // Check sale dates
  const now = new Date();
  const saleNotStarted = ticketType.sale_start_date && new Date(ticketType.sale_start_date) > now;
  const saleEnded = ticketType.sale_end_date && new Date(ticketType.sale_end_date) < now;

  return (
    <Card className={`p-4 ${isSoldOut || saleNotStarted || saleEnded ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{ticketType.name}</h4>
            {isSoldOut && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                Sold Out
              </span>
            )}
            {isLowStock && !isSoldOut && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                {available} left
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
              Sales start {format(new Date(ticketType.sale_start_date), "MMM d, h:mm a")}
            </p>
          )}

          {saleEnded && (
            <p className="text-xs text-destructive">Sales ended</p>
          )}

          <p className="text-lg font-semibold text-primary">
            {ticketType.price === 0 ? "Free" : `$${ticketType.price.toFixed(2)}`}
          </p>
        </div>

        {/* Quantity Selector */}
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