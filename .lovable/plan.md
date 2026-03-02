

## Problem

When the user logs back in, `useEventParticipation` initializes `isParticipating` as `false` (the `useState` default). The actual participation check runs asynchronously in a `useEffect`. During the gap between render and query completion, the button shows "Reserve Spot" / "Join MeetUp" — even if the user already reserved. Tapping it during this window creates a duplicate booking (the `upsert` prevents a DB error, but the UX is broken — toast fires, calendar entry duplicated, count incremented).

## Root Cause

There is no `checking` / `initialLoading` state. The hook returns `isParticipating: false` immediately, and nothing tells consuming components to wait.

## Solution

Add a `checking` boolean to `useEventParticipation` that starts `true` and flips to `false` once the initial participation query completes. Consuming components disable the CTA button while `checking` is true.

### Changes

**1. `src/hooks/useEventParticipation.ts`**
- Add `const [checking, setChecking] = useState(true)`
- Set `setChecking(true)` at start of the `checkParticipation` effect, `setChecking(false)` in finally block
- Return `checking` from the hook
- Guard `toggleParticipation` to also bail if `checking` is true

**2. `src/components/crossover/NewsCard.tsx`**
- Destructure `checking` from `useEventParticipation`
- Pass `checking` into the button disabled state — when `checking` is true, the CTA button shows a loading spinner and is non-interactive

**3. `src/components/meetups/MeetupDetailsDrawer.tsx`**
- Same pattern: if it has its own participation check, disable the Join/Reserve button while checking

This is a minimal 2-3 file change. No database changes needed.

