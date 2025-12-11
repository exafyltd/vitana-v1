/**
 * Shared CTA logic utilities for Events & Meetups
 * 
 * This file contains all helper functions and types for determining
 * the correct CTA button state across event cards, drawers, and landing pages.
 */

import { TicketType } from '@/hooks/useEventTickets';

// ============== Types ==============

export interface EventCtaMetadata {
  has_tickets?: boolean;
  is_paid?: boolean;
  [key: string]: any;
}

export interface EventCtaEvent {
  id: string;
  event_type?: string;
  metadata?: EventCtaMetadata | null;
}

export interface CtaConfig {
  label: string;
  icon: 'ticket' | 'calendar' | 'user-plus' | 'user-minus' | 'check' | 'eye';
  variant: 'ticket' | 'join' | 'secondary' | 'disabled' | 'view-ticket';
  disabled?: boolean;
  action: 'buy-ticket' | 'get-free-ticket' | 'view-ticket' | 'join' | 'leave' | 'reserve' | 'cancel' | 'sold-out';
  priceLabel?: string;
}

// ============== Helper Functions ==============

/**
 * Check if event has ticketing enabled
 */
export function isTicketedEvent(event: EventCtaEvent | null | undefined): boolean {
  if (!event) return false;
  return event.metadata?.has_tickets === true;
}

/**
 * Check if event is a paid event (has tickets with price > 0)
 */
export function isPaidEvent(
  event: EventCtaEvent | null | undefined, 
  ticketTypes?: TicketType[]
): boolean {
  if (!event) return false;
  
  // First check metadata flag
  if (event.metadata?.is_paid === true) return true;
  if (event.metadata?.is_paid === false) return false;
  
  // If no metadata, check ticket types for any with price > 0
  if (ticketTypes && ticketTypes.length > 0) {
    return ticketTypes.some(t => t.price > 0);
  }
  
  // Default: if has_tickets but no is_paid flag, treat as paid (safer assumption)
  if (event.metadata?.has_tickets === true) {
    return true;
  }
  
  return false;
}

/**
 * Get the lowest available ticket price in cents
 */
export function getLowestAvailableTicketPrice(ticketTypes?: TicketType[]): number | null {
  if (!ticketTypes || ticketTypes.length === 0) return null;
  
  const availableTickets = ticketTypes.filter(t => {
    const remaining = t.quantity_available - t.quantity_sold;
    return t.is_active && remaining > 0;
  });
  
  if (availableTickets.length === 0) return null;
  
  const prices = availableTickets.map(t => t.price);
  return Math.min(...prices);
}

/**
 * Check if event is sold out
 */
export function isEventSoldOut(ticketTypes?: TicketType[]): boolean {
  if (!ticketTypes || ticketTypes.length === 0) return false;
  
  // Event is sold out if ALL ticket types have no remaining capacity
  return ticketTypes.every(t => {
    const remaining = t.quantity_available - t.quantity_sold;
    return remaining <= 0;
  });
}

/**
 * Check if user already has a ticket for this event
 * (This should be called with user's ticket purchases)
 */
export function userHasTicketForEvent(
  eventId: string,
  userTickets?: Array<{ event_id: string; status: string }>
): boolean {
  if (!userTickets || userTickets.length === 0) return false;
  
  return userTickets.some(
    ticket => ticket.event_id === eventId && ticket.status === 'completed'
  );
}

/**
 * Check if event type is a meetup (RSVP-style event)
 */
export function isMeetupType(event: EventCtaEvent | null | undefined): boolean {
  if (!event) return false;
  const eventType = event.event_type?.toLowerCase();
  return eventType === 'meetup';
}

/**
 * Format price for display
 */
export function formatTicketPrice(priceInCents: number, currency: string = 'USD'): string {
  const amount = priceInCents / 100;
  
  // For common currencies, use symbol
  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };
  
  const symbol = currencySymbols[currency.toUpperCase()];
  
  if (symbol) {
    // Format without decimals if whole number
    if (amount === Math.floor(amount)) {
      return `${symbol}${amount}`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  // Fallback to currency code
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

// ============== Main CTA Logic ==============

export interface GetEventCtaOptions {
  event: EventCtaEvent | null | undefined;
  ticketTypes?: TicketType[];
  userHasTicket?: boolean;
  isParticipating?: boolean;
  context: 'card' | 'drawer' | 'public-landing';
  isAuthenticated?: boolean;
}

/**
 * Get the appropriate CTA configuration for an event
 * This is the main function that implements the unified decision tree.
 */
export function getEventCta(options: GetEventCtaOptions): CtaConfig {
  const { 
    event, 
    ticketTypes = [], 
    userHasTicket = false, 
    isParticipating = false,
    context,
    isAuthenticated = false
  } = options;
  
  if (!event) {
    return {
      label: 'View Event',
      icon: 'calendar',
      variant: 'secondary',
      action: 'join',
    };
  }
  
  const isTicketed = isTicketedEvent(event);
  const isPaid = isPaidEvent(event, ticketTypes);
  const isSoldOut = isEventSoldOut(ticketTypes);
  const isMeetup = isMeetupType(event);
  const lowestPrice = getLowestAvailableTicketPrice(ticketTypes);
  const currency = ticketTypes[0]?.currency || 'USD';
  
  // ============== TICKETED EVENTS ==============
  if (isTicketed) {
    // Priority 1: User already has ticket
    if (userHasTicket) {
      return {
        label: 'View Ticket',
        icon: 'eye',
        variant: 'view-ticket',
        action: 'view-ticket',
      };
    }
    
    // Priority 2: Sold out
    if (isSoldOut) {
      return {
        label: 'Sold Out',
        icon: 'ticket',
        variant: 'disabled',
        disabled: true,
        action: 'sold-out',
      };
    }
    
    // Priority 3: Paid event with available tickets
    if (isPaid) {
      const priceLabel = lowestPrice !== null 
        ? formatTicketPrice(lowestPrice, currency)
        : undefined;
      
      return {
        label: lowestPrice !== null ? `Buy Ticket · ${priceLabel}` : 'Buy Ticket',
        icon: 'ticket',
        variant: 'ticket',
        action: 'buy-ticket',
        priceLabel,
      };
    }
    
    // Priority 4: Free ticketed event
    return {
      label: 'Get Free Ticket',
      icon: 'ticket',
      variant: 'ticket',
      action: 'get-free-ticket',
    };
  }
  
  // ============== NON-TICKETED EVENTS (RSVP) ==============
  
  // Check if user is already participating
  if (isParticipating) {
    if (isMeetup) {
      return {
        label: 'Leave MeetUp',
        icon: 'user-minus',
        variant: 'secondary',
        action: 'leave',
      };
    }
    return {
      label: 'Cancel Reservation',
      icon: 'user-minus',
      variant: 'secondary',
      action: 'cancel',
    };
  }
  
  // User is not participating
  if (isMeetup) {
    return {
      label: 'Join MeetUp',
      icon: 'user-plus',
      variant: 'join',
      action: 'join',
    };
  }
  
  return {
    label: 'Reserve Spot',
    icon: 'user-plus',
    variant: 'join',
    action: 'reserve',
  };
}

/**
 * Get CTA for public landing pages (special handling for unauthenticated users)
 */
export function getPublicLandingCta(options: {
  hasTickets: boolean;
  isPaid: boolean;
  isSoldOut?: boolean;
  lowestPrice?: number | null;
  currency?: string;
  isAuthenticated?: boolean;
  userHasTicket?: boolean;
}): CtaConfig {
  const { 
    hasTickets, 
    isPaid, 
    isSoldOut = false, 
    lowestPrice,
    currency = 'USD',
    isAuthenticated = false,
    userHasTicket = false
  } = options;
  
  // Priority 1: User has ticket (authenticated with ticket)
  if (isAuthenticated && userHasTicket) {
    return {
      label: 'View Ticket',
      icon: 'eye',
      variant: 'view-ticket',
      action: 'view-ticket',
    };
  }
  
  // Priority 2: Ticketed events - same logic for authenticated and unauthenticated
  if (hasTickets) {
    if (isSoldOut) {
      return {
        label: 'Sold Out',
        icon: 'ticket',
        variant: 'disabled',
        disabled: true,
        action: 'sold-out',
      };
    }
    
    if (isPaid) {
      const priceLabel = lowestPrice !== null && lowestPrice !== undefined
        ? formatTicketPrice(lowestPrice, currency)
        : undefined;
      
      return {
        label: 'Buy Ticket',
        icon: 'ticket',
        variant: 'ticket',
        action: 'buy-ticket',
        priceLabel,
      };
    }
    
    return {
      label: 'Get Free Ticket',
      icon: 'ticket',
      variant: 'ticket',
      action: 'get-free-ticket',
    };
  }
  
  // Priority 3: Non-ticketed event
  return {
    label: 'Reserve My Spot',
    icon: 'calendar',
    variant: 'join',
    action: 'reserve',
  };
}
