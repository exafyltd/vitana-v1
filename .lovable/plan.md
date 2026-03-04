

# Plan: Add EUR Currency Option to Ticket Pricing

## What Changes

### 1. Update `TicketTypeInput` interface (`src/components/tickets/TicketTypeForm.tsx`)
- Add `currency: 'USD' | 'EUR'` field to the interface (default: `'USD'`)

### 2. Update `TicketTypeForm` component (`src/components/tickets/TicketTypeForm.tsx`)
- Add a currency selector (dropdown/toggle) next to the price input field
- Options: USD ($) and EUR (EUR)
- Default new tickets to `'USD'`
- Update the price label dynamically to show `$` or `EUR` based on selection
- Update `addTicketType` and `addFromTemplate` to include `currency: 'USD'`

### 3. Update `CreateEventPopup.tsx` (line ~290)
- Change the hardcoded `currency: 'USD'` to use `ticket.currency` from the form data when inserting into `event_ticket_types`

### 4. Display updates
- The ticket purchase UI and Stripe checkout already read `currency` from the database `event_ticket_types` table, so no changes needed downstream -- the EUR value will flow through automatically to Stripe (which supports EUR natively).

## Scope
- 2 files modified: `TicketTypeForm.tsx`, `CreateEventPopup.tsx`
- No database schema changes needed (the `currency` column already exists in `event_ticket_types` as a text field)
- Works on both mobile and desktop (same form components)

