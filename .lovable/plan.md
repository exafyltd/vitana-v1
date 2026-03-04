

# Plan: Fix Ticket Purchase Price Mismatch

## Root Cause

There are **two independent price sources** that are out of sync:

1. **Event cards** display `metadata.price` + `metadata.display_currency` (set when creating/editing events)
2. **Ticket selector & Stripe checkout** use `event_ticket_types.price` + `event_ticket_types.currency`

For example, "Maxina Experience by KIRA Santanyi" shows **€149 EUR** on the card (from metadata), but the ticket type in the database has **$99 USD** or even **$10 USD**. This happened because a legacy migration auto-created ticket types with wrong prices and always defaulted to USD.

The user confirmed: **card price (metadata) is the source of truth**, and we should **run a one-time data sync** to fix existing events.

## Changes

### 1. One-time data sync (SQL via insert tool)

Update all `event_ticket_types` rows to match their parent event's `metadata.price` and `metadata.display_currency`:

```sql
UPDATE public.event_ticket_types t
SET 
  price = COALESCE((e.metadata->>'price')::numeric, t.price),
  currency = COALESCE(UPPER(e.metadata->>'display_currency'), t.currency)
FROM public.global_community_events e
WHERE t.event_id = e.id
  AND t.is_active = true
  AND (e.metadata->>'has_tickets')::boolean = true
  AND (
    t.price IS DISTINCT FROM COALESCE((e.metadata->>'price')::numeric, t.price)
    OR t.currency IS DISTINCT FROM COALESCE(UPPER(e.metadata->>'display_currency'), t.currency)
  );
```

This will fix ~20+ mismatched events (e.g., Maxina Experiences from $99 USD to €149 EUR).

### 2. Sync on event create (`src/components/CreateEventPopup.tsx`, ~line 302-312)

When ticket types are created, ensure the `currency` field uses `formData.displayCurrency` instead of defaulting to `'USD'`:

```typescript
currency: ticket.currency || formData.displayCurrency || 'USD',
```

### 3. Sync on event edit (`src/components/EditMeetupPopup.tsx`)

When an event's display price/currency is changed via the edit popup, also update the corresponding `event_ticket_types` rows to match. Add an update call after the event metadata is saved:

```typescript
// After successful event update, sync ticket type prices
if (formData.isPaid) {
  await supabase.from('event_ticket_types')
    .update({ 
      price: parseFloat(formData.price) || 0,
      currency: formData.displayCurrency || 'USD'
    })
    .eq('event_id', event.id)
    .eq('is_active', true);
}
```

### 4. Fix hardcoded `$` in PublicEventLanding price badge (line 290)

Replace:
```typescript
`From $${event.lowest_ticket_price}`
```
With:
```typescript
`From ${formatTicketPrice(event.lowest_ticket_price, event?.metadata?.display_currency || 'USD')}`
```

## Scope
- 1 SQL data update (via insert tool)
- 3 files modified: `CreateEventPopup.tsx`, `EditMeetupPopup.tsx`, `PublicEventLanding.tsx`
- No edge function changes needed
- No database schema changes

## Impact
- All existing events will show and charge the correct price
- Future events will automatically sync ticket type price/currency from the display price
- Both mobile and desktop affected (same components)

