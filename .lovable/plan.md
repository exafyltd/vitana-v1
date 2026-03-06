

## Problem: Ticket Price Not Syncing on Edit

### What's Happening

The database confirms the bug. Three "Maxina Experience by Janina Restaurant" events have `metadata.price = 149` and `metadata.display_currency = EUR` (shown on the card), but their `event_ticket_types` rows still have the old prices:

| Event ID | Card Price | Ticket Price | Ticket Currency |
|----------|-----------|-------------|----------------|
| 1d695c0b | €149 | $99 | USD |
| 1d77334c | €149 | $10 | USD |
| 92606649 | €149 | $99 | USD |

The edit popup (lines 343-351) does have ticket sync code, but it runs **after** the event update and fails silently -- the `await supabase.from('event_ticket_types').update(...)` result is never checked for errors. The likely cause: the RLS policy uses `auth.uid()` which requires an active session, and if the session token has a slight issue or the update simply errors, it's swallowed.

### Plan

**Fix 1: Make ticket sync reliable in `EditMeetupPopup.tsx`**
- Move the ticket sync inside the success block but **check its result** and log/toast on failure
- Also sync for **all** paid events (not just when `formData.isPaid` -- the event was already paid, so even if the toggle didn't change, the price/currency should sync)

**Fix 2: Fix the 3 out-of-sync events now (SQL migration)**
- Run a one-time migration to align the ticket prices for these 3 events:
```sql
UPDATE event_ticket_types SET price = 149, currency = 'EUR'
WHERE event_id IN (
  '1d695c0b-45e4-4f2a-b83e-ed70c71b003b',
  '1d77334c-7a9f-4911-98fa-6db837c42c21',
  '92606649-a22c-43a5-92c6-53974f8a514f'
);
```

**Fix 3: Add a broader safety net**
- After the metadata update in `handleSubmit`, add error handling around the ticket sync so failures are visible to the user instead of silently ignored.

This ensures:
- The 3 broken events are immediately fixed
- Future edits reliably sync ticket prices
- Any sync failures are surfaced to the user

