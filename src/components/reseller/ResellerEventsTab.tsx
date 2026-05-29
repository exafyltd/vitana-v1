/**
 * RESELLER EVENTS TAB
 * 
 * Displays events created by the reseller/producer with:
 * - Sales metrics (tickets sold, revenue)
 * - "View Sales" action to open OrganizerEventSalesSheet
 * - "Sell This Event" action to open SellEventModal for sharing
 * 
 * COMMISSION FLOW:
 * Producers CAN earn commission on their own events. When they share using
 * their reseller link (utm_source=reseller_<code>) and a buyer purchases
 * through that link, commission is calculated normally.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResellerEvents, ResellerEvent } from "@/hooks/useResellerEvents";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { Loader2, Ticket, DollarSign, Share2 } from "lucide-react";
import { StandardHorizontalCard } from "@/components/ui/standard-horizontal-card";
import { OrganizerEventSalesSheet } from "@/components/business/OrganizerEventSalesSheet";
import { SellEventModal } from "./SellEventModal";
import { OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { notifyInfo } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface ResellerEventsTabProps {
  searchQuery: string;
}

// Adapter to convert ResellerEvent to OrganizerEvent format for the sales sheet
function toOrganizerEvent(event: ResellerEvent): OrganizerEvent {
  return {
    id: event.id,
    title: event.title,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    image_url: event.image_url,
    ticketsSold: event.tickets_sold,
    totalCapacity: event.tickets_available + event.tickets_sold,
    totalRevenue: event.gross_revenue,
    buyerCount: event.tickets_sold, // Approximate - each ticket = 1 buyer
    checkedInCount: 0, // Not tracked in ResellerEvent
  };
}

export function ResellerEventsTab({ searchQuery }: ResellerEventsTabProps) {
  const navigate = useNavigate();
  const { data: events = [], isLoading } = useResellerEvents();
  const { data: resellerProfile } = useResellerProfile();
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  
  const [selectedEvent, setSelectedEvent] = useState<OrganizerEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sellModalEvent, setSellModalEvent] = useState<ResellerEvent | null>(null);

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewSales = (event: ResellerEvent) => {
    setSelectedEvent(toOrganizerEvent(event));
    setSheetOpen(true);
  };

  const handleSellEvent = async (event: ResellerEvent) => {
    // If not a reseller yet, activate first
    if (!resellerProfile?.reseller_code) {
      notifyInfo('toasts.reseller.activatingYourResellerProfile');
      const success = await activateResellerForCurrentUser({ showToast: true, redirectAfter: false });
      if (!success) return;
    }
    setSellModalEvent(event);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery ? "No events match your search" : "You haven't created any events yet"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <StandardHorizontalCard
            key={event.id}
            id={event.id}
            screenId="MY_BUSINESS_RESELLER_EVENTS"
            icon={
              event.image_url ? (
                <img 
                  src={event.image_url} 
                  alt={event.title} 
                  className="w-10 h-10 rounded-lg object-cover" 
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-accent" />
                </div>
              )
            }
            title={event.title}
            description={`${formatDate(new Date(event.start_time), "MMM d, yyyy")}${event.location ? ` • ${event.location}` : ""}`}
            badges={[
              { 
                label: `${event.tickets_sold} sold`, 
                variant: 'secondary' as const,
                icon: <Ticket className="h-3 w-3" />
              }
            ]}
            metadata={[
              { 
                icon: <DollarSign className="h-3.5 w-3.5" />, 
                text: formatCurrency(event.gross_revenue),
                color: 'hsl(var(--accent))'
              }
            ]}
            primaryAction={{
              label: 'Sell This Event',
              onClick: () => handleSellEvent(event),
              variant: 'ghost' as const,
              icon: <Share2 className="h-3.5 w-3.5" />,
            }}
            secondaryActions={[
              {
                label: 'View Sales',
                onClick: () => handleViewSales(event),
                icon: <Ticket className="h-3.5 w-3.5" />,
              }
            ]}
            onClick={() => handleSellEvent(event)}
            layoutMode="stack"
            density="compact"
          />
        ))}
      </div>

      <OrganizerEventSalesSheet
        event={selectedEvent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      <SellEventModal
        open={!!sellModalEvent}
        onOpenChange={(open) => !open && setSellModalEvent(null)}
        event={sellModalEvent}
        resellerCode={resellerProfile?.reseller_code || ""}
      />
    </>
  );
}
