

# Add Ticket Type Management to Event Editing

## Problem

When creating events, organizers can define multiple ticket types (Early Bird, General Admission, VIP, etc.) with individual prices, quantities, sale dates, and descriptions using the `TicketTypeForm` component. When editing events, they only see a single price/currency toggle — no way to manage individual ticket types.

## Solution

Replace the simple price section in `EditMeetupPopup` with the same `TicketTypeForm` used during creation, pre-populated with existing ticket types from the database.

## Changes

### 1. `src/components/EditMeetupPopup.tsx` — Add ticket type editing

**Data loading** (inside the `useEffect` that populates form data):
- Fetch existing ticket types from `event_ticket_types` table for this event
- Map them into `TicketTypeInput[]` format and set state

**State**:
- Add `ticketTypes` state (`TicketTypeInput[]`)
- Keep `enableTicketSales` derived from whether ticket types exist
- Remove standalone `price` / `displayCurrency` from formData (replaced by per-ticket-type values)

**UI** (lines 662-747, the "Event Pricing" card):
- Replace the simple paid/price toggle with a `Switch` for "Enable Ticket Sales"
- When enabled, render `<TicketTypeForm ticketTypes={ticketTypes} onChange={setTicketTypes} eventDate={formData.date} />`
- This gives organizers full control: add/remove ticket types, set per-type prices, quantities, sale windows

**Submit** (lines 315-361):
- After updating the event, sync ticket types:
  - Fetch current DB ticket types for the event
  - Delete removed ones (those in DB but not in form)
  - Update existing ones (match by ID if we track it, or by name)
  - Insert new ones
- Remove the old blanket `update all ticket types to same price` logic

### 2. Ticket type ID tracking

Extend the local `TicketTypeInput` usage with an optional `id` field so we can distinguish existing vs new ticket types during save:
- When loading from DB, include the `id`
- On save, items with `id` get updated, items without get inserted, DB items not in the form get deactivated (`is_active = false`)

### Files changed
1. `src/components/EditMeetupPopup.tsx` — Replace simple pricing with `TicketTypeForm`, add DB fetch/sync logic

### What stays the same
- `TicketTypeForm` component unchanged (already supports everything needed)
- Create event flow unchanged
- Reseller options section unchanged
- All non-event (meetup) editing unchanged

