
# Translate Event/Ticket CTA Labels to German

## Problem Summary

When German is selected, all event-related CTAs remain in English. This affects buttons across multiple components including:
- "Buy Ticket" / "Buy Ticket · €XX"
- "Reserve Spot" / "Reserve My Spot"
- "Get Free Ticket"
- "View Ticket"
- "Sold Out"
- "Join MeetUp" / "Leave MeetUp"
- "Cancel Reservation"
- "Get your ticket" / "Join this event" / "Your ticket"
- Loading states: "Processing...", "Joining..."
- "Select Tickets", "Buy Tickets – $XX"

---

## Root Cause Analysis

The CTA labels are hardcoded in two main locations:

1. **`src/lib/eventsCtaUtils.ts`** - The centralized utility file that returns CTA configurations with English labels
2. **Individual components** - Some components override or add additional hardcoded strings

### Affected Files

| File | Hardcoded Strings |
|------|------------------|
| `src/lib/eventsCtaUtils.ts` | ~15 CTA labels returned by `getEventCta()` and `getPublicLandingCta()` |
| `src/components/meetups/MeetupDetailsDrawer.tsx` | "Buy Ticket", "Joining...", "Processing...", "Promote event" |
| `src/components/tickets/EventTicketSelector.tsx` | "Select Tickets", "Get Free Ticket", "Buy Tickets – $X", "Processing..." |
| `src/pages/PublicEventLanding.tsx` | "Your ticket", "Sold out", "Get your ticket", "Join this event" |
| `src/pages/PublicCampaignLanding.tsx` | "Get your ticket", "Join this event" |
| `src/components/crossover/NewsCard.tsx` | Uses labels from `getEventCta()` directly |

---

## German Translations

| English | German |
|---------|--------|
| Buy Ticket | Ticket kaufen |
| Buy Ticket · €XX | Ticket kaufen · €XX |
| Get Free Ticket | Gratis-Ticket |
| Reserve Spot | Platz reservieren |
| Reserve My Spot | Meinen Platz reservieren |
| View Ticket | Ticket anzeigen |
| Sold Out | Ausverkauft |
| Join MeetUp | MeetUp beitreten |
| Leave MeetUp | MeetUp verlassen |
| Cancel Reservation | Reservierung stornieren |
| View Event | Event ansehen |
| Your ticket | Dein Ticket |
| Get your ticket | Hol dir dein Ticket |
| Join this event | Diesem Event beitreten |
| Select Tickets | Tickets auswählen |
| Buy Tickets – $X | Tickets kaufen – X € |
| Processing... | Verarbeitung... |
| Joining... | Beitreten... |

---

## Implementation Approach

### Option A: Translation in Utility File (Recommended)

Modify `eventsCtaUtils.ts` to accept a translate function and return localized labels. This centralizes all CTA translations in one place.

```typescript
// New signature
export function getEventCta(
  options: GetEventCtaOptions,
  translate?: (key: string, fallback: string) => string
): CtaConfig
```

### Option B: Translate at Component Level

Keep utility returning English, translate in each consuming component. This would require changes to 5+ components.

**Recommendation: Option A** - It keeps translation logic centralized and reduces component complexity.

---

## Implementation Plan

### Phase 1: Add Translation Keys (~20 keys)

Add new namespace `eventCta` to `src/i18n/de.json` and `src/i18n/en.json`:

```json
{
  "eventCta": {
    "buyTicket": "Ticket kaufen",
    "buyTicketWithPrice": "Ticket kaufen · {price}",
    "getFreeTicket": "Gratis-Ticket",
    "reserveSpot": "Platz reservieren",
    "reserveMySpot": "Meinen Platz reservieren",
    "viewTicket": "Ticket anzeigen",
    "soldOut": "Ausverkauft",
    "joinMeetup": "MeetUp beitreten",
    "leaveMeetup": "MeetUp verlassen",
    "cancelReservation": "Reservierung stornieren",
    "viewEvent": "Event ansehen",
    "yourTicket": "Dein Ticket",
    "getYourTicket": "Hol dir dein Ticket",
    "joinThisEvent": "Diesem Event beitreten",
    "selectTickets": "Tickets auswählen",
    "buyTicketsTotal": "Tickets kaufen – {total}",
    "processing": "Verarbeitung...",
    "joining": "Beitreten..."
  }
}
```

### Phase 2: Refactor eventsCtaUtils.ts

Create a new function that accepts a translate function:

```typescript
export function getLocalizedEventCta(
  options: GetEventCtaOptions,
  translate: (key: string, fallback: string) => string
): CtaConfig {
  const config = getEventCta(options);
  
  // Map action to localized label
  const labelMap: Record<string, string> = {
    'buy-ticket': config.priceLabel 
      ? translate('eventCta.buyTicketWithPrice', `Buy Ticket · ${config.priceLabel}`).replace('{price}', config.priceLabel)
      : translate('eventCta.buyTicket', 'Buy Ticket'),
    'get-free-ticket': translate('eventCta.getFreeTicket', 'Get Free Ticket'),
    'view-ticket': translate('eventCta.viewTicket', 'View Ticket'),
    'join': translate('eventCta.joinMeetup', 'Join MeetUp'),
    'leave': translate('eventCta.leaveMeetup', 'Leave MeetUp'),
    'reserve': translate('eventCta.reserveSpot', 'Reserve Spot'),
    'cancel': translate('eventCta.cancelReservation', 'Cancel Reservation'),
    'sold-out': translate('eventCta.soldOut', 'Sold Out'),
  };
  
  return {
    ...config,
    label: labelMap[config.action] || config.label
  };
}
```

### Phase 3: Update Consuming Components

#### MeetupDetailsDrawer.tsx
- Import `useTranslation`
- Use `getLocalizedEventCta()` or translate labels inline
- Translate "Processing...", "Joining...", "Buy Ticket" override

#### EventTicketSelector.tsx
- Import `useTranslation`
- Translate button states: "Select Tickets", "Get Free Ticket", "Buy Tickets – $X", "Processing..."

#### PublicEventLanding.tsx
- Import `useTranslation`
- Translate helper text: "Your ticket", "Sold out", "Get your ticket", "Join this event"
- Use localized CTA from utility

#### PublicCampaignLanding.tsx
- Import `useTranslation`
- Translate "Get your ticket", "Join this event"
- Use localized CTA from utility

#### NewsCard.tsx
- Import `useTranslation`
- Pass translate function to `getLocalizedEventCta()`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | +20 keys under `eventCta.*` |
| `src/i18n/en.json` | +20 keys under `eventCta.*` (English equivalents) |
| `src/lib/eventsCtaUtils.ts` | Add `getLocalizedEventCta()` helper function |
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Use translation hook + translate CTA labels |
| `src/components/tickets/EventTicketSelector.tsx` | Translate button labels |
| `src/pages/PublicEventLanding.tsx` | Translate CTA section labels |
| `src/pages/PublicCampaignLanding.tsx` | Translate CTA section labels |
| `src/components/crossover/NewsCard.tsx` | Use localized CTA function |

---

## Acceptance Criteria

- [ ] "Ticket kaufen" shows when German is selected on event cards
- [ ] "Platz reservieren" shows for non-ticketed events in German
- [ ] "Gratis-Ticket" shows for free ticketed events in German
- [ ] "Ausverkauft" shows for sold-out events in German
- [ ] "Ticket anzeigen" shows when user already has ticket in German
- [ ] Public landing pages show German CTA labels
- [ ] Event detail drawer shows German CTA labels
- [ ] Ticket selector shows German button labels
- [ ] Loading states show "Verarbeitung..." / "Beitreten..." in German
- [ ] All components continue to show English labels when English is selected
