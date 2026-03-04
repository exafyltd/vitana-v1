

# Plan: Fix MEETUP badges persisting in Hot tab

## Root Cause

The issue has **two sources**:

1. **Database: Jovana's events not updated** -- The Hot tab code filters by `MAXINA_CREATOR_ID` (Mariia, `07ade9bf`), and those 41 events ARE already `event_type = 'event'` in the Test DB. However, Jovana (`c7d3260d-8311-4a0b-ab1c-53928a37caec`) has 38 events still typed as `meetup` that may appear in other tabs or when the logged-in user is Jovana.

2. **Live environment not updated** -- The SQL was run as a migration (Test environment only). The Live database was never updated despite the user attempting to run the SQL manually.

3. **No code safeguard** -- The `transformEventToNewsCard` function and `MobileEventCarousel` both use `event.event_type === 'event' ? 'EVENT' : 'MEETUP'` with no override for Hot tab items.

## Plan

### Step 1: Update Jovana's events in database (both catalogs)
Run a data update using the insert tool to convert all meetup-type events from Jovana's catalog:
```sql
UPDATE global_community_events 
SET event_type = 'event' 
WHERE created_by = 'c7d3260d-8311-4a0b-ab1c-53928a37caec' 
  AND event_type != 'event';
```

### Step 2: Add code-level safeguard in Hot tab
Override `event_type` to `'event'` for all items rendered in the Hot tab, so even if new meetups are created by these creators, they will always display as events in Hot.

**Files to modify:**

- **`src/pages/community/EventsAndMeetups.tsx`** (line ~448-450): After filtering `maxinaEvents`, map each event to override `event_type`:
  ```ts
  const maxinaEvents = useMemo(() => {
    return dbEvents
      .filter(event => event.created_by === MAXINA_CREATOR_ID)
      .map(event => ({ ...event, event_type: 'event' }));
  }, [dbEvents]);
  ```

- Both the desktop `transformEventToNewsCard` and `MobileEventCarousel.transformEventToCard` will then naturally receive `event_type: 'event'` and render "EVENT" badges, "Reserve Spot" CTAs, and event-specific edit drawers.

### Step 3: Live environment SQL
Provide the user with the SQL to run manually in Supabase Cloud View with **Live** selected:
```sql
UPDATE global_community_events 
SET event_type = 'event' 
WHERE created_by IN (
  '07ade9bf-9c2f-4fe1-a733-29e85a1d253b',
  'c7d3260d-8311-4a0b-ab1c-53928a37caec'
) AND event_type != 'event';
```

## Impact
- Hot tab: All items show "EVENT" badge, "Reserve Spot" or "Buy Ticket" CTA
- Edit drawer: Shows "Edit Event" with pricing and reseller sections (already conditional on `event_type === 'event'`)
- Details drawer: Event badges and labels update automatically via unified CTA logic
- No regressions to other tabs (Today, Upcoming, Following) -- those still read `event_type` from DB

