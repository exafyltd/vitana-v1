import { useState } from "react";
import { format } from "date-fns";
import { Ticket, DollarSign, Users, MapPin, Calendar, UserCheck } from "lucide-react";
import { useOrganizerEvents, OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { VisualHorizontalCard } from "@/components/ui/visual-horizontal-card";
import { OrganizerEventSalesSheet } from "./OrganizerEventSalesSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from '@/lib/i18n-toast';

export function OrganizerEventsSection() {
  const { events, loading, error } = useOrganizerEvents();
  const [selectedEvent, setSelectedEvent] = useState<OrganizerEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleViewSales = (event: OrganizerEvent) => {
    setSelectedEvent(event);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[160px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('screens.business.noTicketedEventsYet')}</h3>
        <p className="text-muted-foreground">
          Create an event with ticket sales to see your sales dashboard here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {events.map((event) => (
          <VisualHorizontalCard
            key={event.id}
            id={event.id}
            screenId="MY_BUSINESS_TICKET_SALES"
            imageUrl={event.image_url || "/placeholder.svg"}
            imageAlt={event.title}
            layoutMode="stack"
            onClick={() => handleViewSales(event)}
            category={{
              icon: "🎫",
              label: "My Event",
              color: "hsl(var(--accent))",
            }}
            title={event.title}
            description={`${event.location ? `📍 ${event.location}` : "Online"} • 📅 ${format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}`}
            metadata={[
              {
                icon: <Ticket className="w-3.5 h-3.5" />,
                text: `${event.ticketsSold} sold`,
              },
              {
                icon: <DollarSign className="w-3.5 h-3.5" />,
                text: `$${event.totalRevenue.toLocaleString()}`,
              },
              {
                icon: <UserCheck className="w-3.5 h-3.5" />,
                text: `${event.checkedInCount} checked in`,
              },
            ]}
            statusBadge={
              event.ticketsSold > 0
                ? {
                    label: `${event.buyerCount} buyer${event.buyerCount !== 1 ? "s" : ""}`,
                    variant: "secondary",
                    icon: <Users className="w-3.5 h-3.5" />,
                  }
                : undefined
            }
            primaryAction={{
              label: "View Sales",
              onClick: () => handleViewSales(event),
            }}
          />
        ))}
      </div>

      <OrganizerEventSalesSheet
        event={selectedEvent}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
