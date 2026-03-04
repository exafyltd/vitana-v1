

# Plan: Fix EUR Currency Display on Event Cards

## Problem
The currency selector saves correctly to `metadata.display_currency`, but the event card always shows `$` because it's hardcoded in `NewsCard.tsx` line 379: `` `$${price}` ``.

## Changes

### 1. Add `currency` prop to `NewsCard` (`src/components/crossover/NewsCard.tsx`)
- Add `currency?: string` to `NewsCardProps` interface (line ~35)
- Update line 379 from `` `$${price}` `` to use the currency symbol:
  ```
  {price === "free" ? "FREE" : `${currency === 'EUR' ? '€' : '$'}${price}`}
  ```

### 2. Pass currency from event metadata in all `transformEventToNewsCard` functions
Three files have this function — each needs `currency: event.metadata?.display_currency || 'USD'` added to the returned object:

- **`src/pages/community/EventsAndMeetups.tsx`** (line ~138)
- **`src/pages/community/Events.tsx`** (~line 240+)
- **`src/pages/community/Meetups2.tsx`** (~line 231+)

### 3. Update `eventCardToNewsCardProps` transformer (`src/lib/eventCardTransformers.ts`)
- Pass through currency if available in the unified event card type

## Scope
- 4-5 files, minimal changes per file
- No database or Stripe changes

