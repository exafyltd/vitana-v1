

# Fix: Missing Currency on Mobile Event Cards

## Problem
In `MobileEventCarousel.tsx`, the `transformEventToCard` function (line 151-202) passes `price` but **does not pass `currency`**. The `NewsCard` component defaults to `$` (USD) when no currency is provided, so EUR events show `$149` instead of `€149` on mobile.

Desktop pages (`EventsAndMeetups.tsx`, `Events.tsx`, `Meetups2.tsx`) all correctly pass `currency: event.metadata?.display_currency || 'USD'`.

## Fix
One-line addition in `src/components/community/MobileEventCarousel.tsx` at line 162, inside the return object of `transformEventToCard`:

```typescript
price: event.metadata?.is_paid ? Number(event.metadata?.price || 0) : ('free' as const),
currency: event.metadata?.display_currency || 'USD',  // ADD THIS LINE
eventId: event.id,
```

### Scope
- **1 file**: `src/components/community/MobileEventCarousel.tsx`
- **1 line added**

