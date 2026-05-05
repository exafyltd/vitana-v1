import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { Ticket, Calendar, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EventTicket } from "@/components/tickets/EventTicket";
import { useMyTickets, TicketPurchase } from "@/hooks/useEventTickets";
import { t } from '@/lib/i18n-toast';

export default function MyTickets() {
  const navigate = useNavigate();
  const { tickets, loading } = useMyTickets();
  const [selectedTicket, setSelectedTicket] = useState<TicketPurchase | null>(null);

  const upcomingTickets = tickets.filter(
    (t) => t.event && !isPast(new Date(t.event.start_time))
  );
  const pastTickets = tickets.filter(
    (t) => t.event && isPast(new Date(t.event.start_time))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/5 to-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('screens.mytickets.myTickets')}</h1>
              <p className="text-muted-foreground">{t('screens.mytickets.lengthTicketValue1Purchased', { length: tickets.length, value1: tickets.length !== 1 ? "s" : "" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {tickets.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Ticket className="h-16 w-16 text-muted-foreground/30 mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">{t('screens.mytickets.noTicketsYet')}</h2>
            <p className="text-muted-foreground">
              {t('screens.mytickets.whenYouPurchaseEventTicketsThey')}
            </p>
            <Button onClick={() => navigate("/comm/events-meetups")}>
              {t('screens.mytickets.browseEvents')}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">{t('screens.mytickets.upcomingLength', { length: upcomingTickets.length })}
              </TabsTrigger>
              <TabsTrigger value="past">{t('screens.mytickets.pastLength', { length: pastTickets.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingTickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('screens.mytickets.noUpcomingEvents')}
                </div>
              ) : (
                upcomingTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastTickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{t('screens.mytickets.noPastEvents')}
                </div>
              ) : (
                pastTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => setSelectedTicket(ticket)}
                    isPast
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selectedTicket && (
            <div className="p-4">
              <EventTicket
                ticketNumber={selectedTicket.ticket_number}
                eventTitle={selectedTicket.event?.title || "Event"}
                eventDate={new Date(selectedTicket.event?.start_time || Date.now())}
                eventLocation={selectedTicket.event?.location || ""}
                eventImageUrl={selectedTicket.event?.image_url || undefined}
                ticketType={selectedTicket.ticket_type?.name || "General Admission"}
                buyerName={selectedTicket.buyer_name}
                quantity={selectedTicket.quantity}
                qrCodeData={selectedTicket.qr_code_token}
                sequence={1}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TicketCardProps {
  ticket: TicketPurchase;
  onClick: () => void;
  isPast?: boolean;
}

function TicketCard({ ticket, onClick, isPast }: TicketCardProps) {
  const event = ticket.event;
  const ticketType = ticket.ticket_type;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-accent/5 transition-colors ${
        isPast ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-4">
        {/* Event Image */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {event?.image_url ? (
            <img
              src={event.image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Ticket className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-semibold text-foreground truncate">
            {event?.title || "Event"}
          </h3>
          
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {event?.start_time
                ? format(new Date(event.start_time), "EEE, MMM d • h:mm a")
                : "Date TBA"}
            </span>
          </div>

          {event?.location && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {ticketType?.name || "General"}
            </span>
            {ticket.quantity > 1 && (
              <span className="text-xs text-muted-foreground">
                × {ticket.quantity}
              </span>
            )}
            {ticket.checked_in_at && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                {t('screens.mytickets.checked')}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground self-center flex-shrink-0" />
      </div>
    </button>
  );
}
