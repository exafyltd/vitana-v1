

## Problem: Past Events Displayed in Event Listings

### Root Cause

The data-fetching function `fetchCommunityEventsQueryFn` in `src/hooks/useCommunityEvents.ts` (line 61-64) fetches **every event ever created** — no date filter:

```typescript
const { data, error } = await supabase
  .from("global_community_events")
  .select("*")
  .order("start_time", { ascending: true });
```

While the "Today" and "Upcoming" tabs correctly filter events by date on the client side, other views do not:

- **"Recommended" tab** (`maxinaEvents`) filters only by `created_by` — shows all past MAXINA events
- **The raw `events` array** returned from the hook includes everything, so any consumer not applying their own date filter will show past events
- **Search results** search across all events including past ones

### Fix (2 changes in 1 file)

**`src/hooks/useCommunityEvents.ts`**:

1. **Add a server-side date filter** to `fetchCommunityEventsQueryFn` — only fetch events where `start_time >= today at midnight`:
   ```typescript
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   const { data, error } = await supabase
     .from("global_community_events")
     .select("*")
     .gte("start_time", today.toISOString())
     .order("start_time", { ascending: true });
   ```

2. This single change fixes all downstream consumers — the "Recommended"/Catalog tab, search, home page cards, community page, and personalized content all inherit the filter because they all consume from this same query function.

**Note**: If there is a separate "Past Events" or "Event History" view needed in the future, it would use its own query with a `lt` filter. This change only affects the main community events feed.

