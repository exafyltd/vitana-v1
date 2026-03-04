

# Plan: EUR Currency + Detailed Description + Extended Durations

No disruption to Stripe payments — the edge function already reads currency from the DB and passes it to Stripe, which natively supports EUR.

## 1. Currency selector on event pricing fields

**Files:** `CreateEventPopup.tsx`, `EditMeetupPopup.tsx`

- Add a USD/EUR dropdown next to the "Display Price" input field in both popups
- Store selected currency in component state (default: `'USD'`)
- Persist to `metadata.display_currency` when saving
- Update price label to show `$` or `€` dynamically
- The ticket-level currency in `TicketTypeForm.tsx` was already updated — verify it's working

## 2. Detailed Description field

**Files:** `CreateEventPopup.tsx`, `EditMeetupPopup.tsx`, `MeetupDetailsDrawer.tsx`

- Add a `Textarea` labeled "Detailed Description" below the existing Description field
  - Placeholder: "Describe the agenda, program, what's included, giveaways..."
  - ~6 rows, optional
- Store in `metadata.detailed_description` (no schema change needed)
- In `MeetupDetailsDrawer.tsx`: render below the "About" section in a "Details & Program" section, preserving whitespace/newlines

## 3. Extended duration options

**Files:** `CreateEventPopup.tsx`, `EditMeetupPopup.tsx`

- Add options: 3 hours, 4 hours, 5 hours, 6 hours, 8 hours
- Update `durationMap` with corresponding minute values (180, 240, 300, 360, 480)
- Add matching `SelectItem` entries in the duration dropdown

## Scope
- 3 files modified
- No database migration
- No Stripe changes needed
- Works on mobile and desktop

