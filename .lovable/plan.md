

# Plan: Add Date to Event Cards

## Problem
All event cards across the app only show the **time** (e.g., "14:00") — the date is completely missing. Users can't tell *when* an event is without opening the drawer.

## Root Cause
There are **7+ copies** of `formatEventTime` across the codebase, all returning only `HH:mm`. Meanwhile, `eventCardTransformers.ts` correctly formats as `"Mon, Mar 5 · 14:00"` but is only used by `EventImageCard`.

## Solution
Update the `formatEventTime` function in all event listing pages to include the date. The format will be `"Mon, Mar 5 · 14:00"` — short day name, month, day number, then time. This matches what `eventCardTransformers.ts` already does.

### Files to update (same one-line change in each)

Replace the `formatEventTime` body from:
```typescript
return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
```
To:
```typescript
return `${date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })} · ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
```

**Files affected:**
1. `src/pages/community/EventsAndMeetups.tsx` (line ~44)
2. `src/pages/community/Events.tsx` (line ~232)
3. `src/pages/community/Meetups2.tsx` (line ~354)
4. `src/components/community/MobileEventCarousel.tsx` (line ~9)
5. `src/components/home/CommunityEventsCard.tsx` (line ~73) — this one already has relative formatting ("Today", "Tomorrow"), so we'll keep that logic but add the day name for other dates

## Result
Event cards will show e.g. **"Mon, 5 Mar · 14:00"** in the timestamp badge at the top-right, making the date immediately visible without opening the drawer.

No backend changes. Works on both mobile and desktop.

