

# Plan: Fix Currency Display in Ticket Purchase Flow

## Problem
The event card correctly shows **€149** (reading from event metadata with proper currency), but the ticket purchase UI hardcodes `$` everywhere. The `EventTicketSelector` and `TicketTypeCard` components ignore `ticketType.currency`, always displaying dollar signs.

## Root Cause
Multiple locations hardcode `$` instead of using the ticket type's `currency` field:

1. **`EventTicketSelector.tsx`** — 10+ instances of hardcoded `$` in price displays (lines 273-280, 300, 364-369)
2. **`PublicEventLanding.tsx`** — hardcoded `currency: 'USD'` on line 161
3. **`PublicCampaignLanding.tsx`** — hardcoded `From $` on line 320

## Changes

### 1. `src/components/tickets/EventTicketSelector.tsx`

Add a currency symbol helper (reuse the `CURRENCY_SYMBOLS` map from `TicketTypeForm.tsx`) and replace all hardcoded `$` with the dynamic symbol from `ticketType.currency`:

- **TicketTypeCard** (lines 361-371): Use `ticketType.currency` to pick `€` or `$`
- **Summary section** (lines 272-280): Derive currency from first selected ticket type's currency
- **Buy button** (line 300): Same currency-aware formatting
- **"From $" header**: If present, use currency from first ticket type

All `$${price.toFixed(2)}` patterns become `${symbol}${price.toFixed(2)}`.

### 2. `src/pages/PublicEventLanding.tsx` (line 161)

Replace hardcoded `currency: 'USD'` with the actual currency from the event's ticket types or metadata:
```typescript
currency: event?.metadata?.display_currency || 'USD',
```

### 3. `src/pages/PublicCampaignLanding.tsx` (line 320)

Replace `From $${eventPrice}` with currency-aware formatting using the linked event's currency.

## Scope
- 3 files modified
- No backend/database changes
- Mobile and desktop both affected (same component)

