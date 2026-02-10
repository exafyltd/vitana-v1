

# Fix: Mobile Events "One Card = One Screen" Snap-Scroll

## Problem

Cards merge into each other because:
1. **Height mismatch** -- the scroll container is `100vh - 200px` but cards are `100vh - 280px`, leaving 80px of dead space where the next card peeks through with no visual separator
2. **No `scroll-snap-stop: always`** -- fast swipes skip multiple cards
3. **Parent page scrolls freely** -- the outer `div` in `EventsAndMeetups.tsx` has `min-h-screen` and no `overflow-hidden` on mobile, so the browser's native scroll competes with the snap container
4. **No visual boundaries** -- cards have no padding, gap, or separator between them

## Changes

### 1. `src/components/community/MobileEventCarousel.tsx`

- Make the **container height and card height identical** using a shared CSS custom property: `--card-h: calc(100dvh - 216px)` (216px accounts for the header chrome above). Both the container `height` and each card wrapper `height` use this same value so exactly one card fills one "page"
- Add `scroll-snap-stop: always` on each card wrapper to prevent skipping
- Add vertical padding inside each card wrapper (`py-2 px-3`) so the NewsCard has breathing room and clear edges
- Add a subtle visual separator line between cards (a thin `border-b border-border/30`) so you can see where one ends and another begins
- Add a scale animation: the active card is `scale(1)`, inactive cards are `scale(0.97)` with reduced opacity, making the "page" effect more tangible

### 2. `src/pages/community/EventsAndMeetups.tsx`

- On mobile, set the outermost wrapper to `h-[100dvh] overflow-hidden` instead of `min-h-screen` so the page itself cannot scroll -- only the snap container inside scrolls
- Set the content area below the tabs to `overflow-hidden` on mobile so it doesn't create a competing scroll context

These two changes together ensure cards are self-contained pages with clear boundaries that snap reliably one-at-a-time.

## Technical Details

**MobileEventCarousel.tsx** key markup change:
```tsx
// Container - height matches exactly one card
<div
  ref={containerRef}
  className="overflow-y-auto snap-y snap-mandatory scrollbar-hide"
  style={{
    height: 'var(--card-h)',
    overscrollBehavior: 'contain',
    '--card-h': 'calc(100dvh - 216px)',
  }}
>
  {events.map((event, index) => (
    <div
      key={event.id}
      data-index={index}
      className="snap-start"
      style={{
        height: 'var(--card-h)',
        scrollSnapStop: 'always',
        padding: '8px 12px',
      }}
    >
      <NewsCard ... className="h-full rounded-2xl" />
    </div>
  ))}
</div>
```

**EventsAndMeetups.tsx** mobile wrapper change (line ~649):
```tsx
// Wrap outer div conditionally on mobile
<div className={cn(
  "p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50",
  isMobile ? "h-[100dvh] overflow-hidden" : "min-h-screen"
)}>
```

