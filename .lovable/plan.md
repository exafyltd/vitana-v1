

## Fix "Reserve Spot" Persistence and Calendar Integration

### Root Causes Found

Three interconnected bugs prevent the "Reserve Spot" flow from working end-to-end:

1. **Drawer never checks existing participation on open**: `isJoined` is initialized as `useState(false)` and is never synced with the database. So every time the drawer opens, it shows "Reserve Spot" even if the user already joined.

2. **Card "Reserve Spot" skips calendar**: The `NewsCard` component calls `useEventParticipation.toggleParticipation()` which only writes to `global_event_participants` but never adds the event to the VITANA Smart Calendar (`calendar_events` table).

3. **Drawer "Cancel Reservation" is a no-op**: The leave/cancel handler (lines 1307-1324) only calls `setIsJoined(false)` -- it never deletes from `global_event_participants` or removes from `calendar_events`. The reservation stays in the database forever.

### Changes

**1. `src/hooks/useEventParticipation.ts`**

- Accept optional event metadata (title, start_time, end_time, location, slug) so it can also add to the Smart Calendar
- When joining: after inserting into `global_event_participants`, also call `addEvent` from `useCalendarEvents` to add to the VITANA calendar (with `meetup_id` in metadata)
- When leaving: after deleting from `global_event_participants`, also remove the matching calendar event
- This makes the hook the single source of truth for participation, used by both the card and the drawer

**2. `src/components/meetups/MeetupDetailsDrawer.tsx`**

- Add a `useEffect` that checks participation status when the drawer opens (query `global_event_participants` for the current user and event)
- Set `isJoined` to `true` if a record exists with status `attending`
- Replace the broken leave/cancel handler (lines 1307-1324) with actual database deletion from `global_event_participants` and removal from `calendar_events`
- Use `removeEvent` (already imported) to clean up the calendar entry on cancellation

**3. `src/components/crossover/NewsCard.tsx`**

- Pass event metadata (title, start_time, location, etc.) to `useEventParticipation` so it can create the calendar entry
- No change to the CTA action mapping -- `toggleParticipation()` will now handle both DB and calendar

### Technical Details

The `useEventParticipation` hook will be enhanced with an optional `eventDetails` parameter:

```text
useEventParticipation(eventId, initialCount, {
  title: "Event Name",
  start_time: "2026-02-20T13:00:00",
  end_time: "2026-02-20T15:00:00",
  location: "HQ",
  slug: "event-slug"
})
```

When these details are provided and the user joins, the hook will:
1. Insert into `global_event_participants` (existing behavior)
2. Call `addEvent()` to create a `calendar_events` record with `metadata.meetup_id` set (new behavior)

When the user leaves, the hook will:
1. Delete from `global_event_participants` (existing behavior)
2. Find and remove the matching calendar event by `metadata.meetup_id` (new behavior)

The drawer's `handleJoin` will be simplified to delegate to a shared function or directly use the enhanced hook, eliminating the duplicate calendar-add logic currently in `handleJoin`.

