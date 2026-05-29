import { TicketPurchase } from '@/hooks/useEventTickets';
import { VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { isPast } from 'date-fns';
import { Calendar, Ticket } from 'lucide-react';
import React from 'react';

import { formatDate } from '@/lib/locale-format';
export function transformTicketToVisualCard(
  ticket: TicketPurchase,
  onViewTicket: (ticket: TicketPurchase) => void
): VisualHorizontalCardProps {
  const isUpcoming = ticket.event && !isPast(new Date(ticket.event.start_time));
  
  return {
    id: ticket.id,
    screenId: 'orders-tickets',
    imageUrl: ticket.event?.image_url || '/placeholder.svg',
    imageAlt: ticket.event?.title || 'Event',
    category: {
      icon: '🎫',
      label: ticket.ticket_type?.name || 'Event Ticket',
      color: isUpcoming ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
    },
    title: ticket.event?.title || 'Event',
    description: ticket.event?.location || 'Location TBD',
    metadata: [
      {
        icon: React.createElement(Calendar, { className: "h-3 w-3" }),
        text: ticket.event?.start_time 
          ? formatDate(new Date(ticket.event.start_time), 'EEE, MMM d • h:mm a')
          : 'Date TBD'
      },
      {
        icon: React.createElement(Ticket, { className: "h-3 w-3" }),
        text: `Qty: ${ticket.quantity} × $${ticket.unit_price}`
      }
    ],
    statusBadge: isUpcoming 
      ? { label: 'Upcoming', variant: 'default' as const, icon: '📅' }
      : { label: 'Attended', variant: 'secondary' as const, icon: '✓' },
    secondaryLabel: `#${ticket.ticket_number}`,
    primaryAction: {
      label: 'View Ticket',
      onClick: () => onViewTicket(ticket),
      variant: 'outline' as const
    },
    layoutMode: 'stack'
  };
}
