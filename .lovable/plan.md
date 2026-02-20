
## Show Maxina Events in the Recommended Tab

### What Needs to Change

The Recommended tab in `src/pages/community/EventsAndMeetups.tsx` currently shows a placeholder empty state. The goal is to replace it with real events — specifically all events created by Mariia Maksina (user ID: `07ade9bf-9c2f-4fe1-a733-29e85a1d253b`).

All the necessary data is already available: `dbEvents` (from `useCommunityEvents`) already contains every event with `created_by` populated. No new data fetching or API calls are needed.

### Plan

**Single file to edit:** `src/pages/community/EventsAndMeetups.tsx`

**Change 1 — Add a constant for Mariia's user ID** (near the top of the `EventsAndMeetups` component, alongside the other state):

```typescript
const MAXINA_CREATOR_ID = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b';
```

**Change 2 — Derive `maxinaEvents` from existing data** (alongside the `todayEvents` / `upcomingEvents` useMemo blocks):

```typescript
const maxinaEvents = useMemo(() => {
  return dbEvents.filter(event => event.created_by === MAXINA_CREATOR_ID);
}, [dbEvents]);
```

This reuses the already-cached data — no extra fetch needed.

**Change 3 — Replace the placeholder in `<SplitBarContent value="recommended">`** (lines 890–899) with actual event rendering, using the same `MobileEventCarousel` / `renderEventGrid` pattern already used in the Today and Upcoming tabs:

- On **mobile**: render `<MobileEventCarousel events={maxinaEvents} ... />`
- On **desktop**: render using `renderEventGrid` / `chunkEvents` (same as Today/Upcoming)
- Add a small header badge/label "Maxina Events" to visually distinguish the source
- Include a proper empty state if no events found

**Change 4 — Fix the drawer navigation for the recommended tab**

The `selectedEventData` lookup and `visibleEventIds` currently only work for Today/Upcoming tabs. The recommended tab also needs its events accessible in the selection context so the drawer navigation arrows work correctly:

```typescript
// Update currentEvents to also cover recommended tab
const currentEvents = activeTab === "today" ? filteredTodayEvents :
                      activeTab === "upcoming" ? filteredUpcomingEvents :
                      activeTab === "recommended" ? maxinaEvents : [];
```

### Technical Details

- **No database changes** needed — events are already fetched
- **No new hooks** needed — filter from `dbEvents` in a `useMemo`
- **Mariia Maksina's user ID** is hardcoded as a constant (same pattern as `DOMAIN_TENANT_MAP` for tenant config — this is a platform-level constant, not user-generated)
- Both her Gmail (`07ade9bf...`) and Outlook (`67c971fc...`) accounts exist; only the Gmail account has events created under it, so only one ID is needed
- The `handleCardClick` handler works correctly for any tab since it uses the event ID generically

### Files to Edit
- `src/pages/community/EventsAndMeetups.tsx` — 4 targeted changes (constant, useMemo, SplitBarContent, currentEvents)
