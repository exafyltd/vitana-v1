

## Investigation Results

I found **two distinct bugs**, both in `src/hooks/useCommunityEvents.ts`:

### Bug 1: Creator Name Shows "Community Host" Instead of Actual Name

**Root cause**: The real-time subscription handlers (lines 273-291) replace cached events with raw `payload.new` data directly from Postgres. This raw payload does NOT contain `creator_display_name` or `creator_avatar_url` (those are enriched client-side during the initial fetch). So whenever any event receives a real-time UPDATE (e.g., participant_count changes, metadata edits), the cached event loses its creator info and falls back to "Community Host".

**Fix**: In the INSERT and UPDATE real-time handlers, preserve the existing `creator_display_name` and `creator_avatar_url` from the cached event. For INSERT (new events), fetch the creator profile before inserting into cache.

### Bug 2: Reserved Spots Not Persisting Visually

**Root cause**: The `participant_count` column on `global_community_events` is **never incremented** when someone joins via `useEventParticipation`. The hook inserts into `global_event_participants` but does not update `global_community_events.participant_count`. The database shows `participant_count: 0` for events that actually have participants.

The `NewsCard` component does use `useEventParticipation` to show a live count, but:
- The initial value passed is `event.participant_count` (always 0)
- `useEventParticipation` only queries the real count after the component mounts and the user is authenticated
- If the auth session isn't ready yet, it shows 0

**Fix**: Update `useEventParticipation.toggleParticipation()` to also increment/decrement `global_community_events.participant_count` after joining/leaving. Additionally, the initial query in `fetchCommunityEventsQueryFn` should fetch actual participant counts from `global_event_participants` instead of relying on the stale column.

### Changes

**1. `src/hooks/useCommunityEvents.ts`** — Real-time handler fix
- UPDATE handler: merge `payload.new` with existing cached event's `creator_display_name`, `creator_avatar_url`, and `is_co_creator` instead of replacing wholesale
- INSERT handler: same — fetch creator profile or at minimum preserve structure

**2. `src/hooks/useCommunityEvents.ts`** — Accurate participant counts
- In `fetchCommunityEventsQueryFn`, after fetching events, batch-query `global_event_participants` grouped by `event_id` to get real attending counts, and override `participant_count` on each event

**3. `src/hooks/useEventParticipation.ts`** — Sync participant_count column
- After successful join: update `global_community_events` set `participant_count = participant_count + 1` where id = eventId
- After successful leave: update `global_community_events` set `participant_count = participant_count - 1` where id = eventId
- This keeps the column in sync for other queries and initial renders

### Technical Detail

The real-time UPDATE handler fix (most impactful change):
```typescript
// BEFORE (loses enriched data):
event.id === payload.new.id ? payload.new as CommunityEvent : event

// AFTER (preserves enriched data):
event.id === payload.new.id 
  ? { ...payload.new as CommunityEvent, 
      creator_display_name: event.creator_display_name,
      creator_avatar_url: event.creator_avatar_url,
      is_co_creator: event.is_co_creator }
  : event
```

Three targeted fixes across two files. No UI changes needed — the existing components already read from the correct fields.

