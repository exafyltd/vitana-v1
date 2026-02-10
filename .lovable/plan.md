

# Mobile Events: Horizontal Carousel to Vertical Scroll

## What Changes

The events overview on mobile (`/comm/events-meetups`) currently uses a **horizontal swipe carousel** (Embla Carousel) where you swipe left/right between event cards. This will be replaced with a **vertical scroll layout** where each event card takes up one full viewport height, and you scroll up/down naturally.

## Why

Vertical scrolling is more natural on mobile (matches native feed behavior). The "one event = one viewport" rule is preserved -- each card fills the screen.

## Technical Approach

### File: `src/components/community/MobileEventCarousel.tsx`

**Replace the Embla horizontal carousel** with a CSS snap-scroll vertical layout:

- Remove the `embla-carousel-react` dependency from this component
- Replace the horizontal `flex` container with a vertical `snap-y snap-mandatory` scroll container
- Each event card gets `snap-start` and `h-[calc(100vh-280px)]` (same height as current cards) to fill one viewport
- Keep the same `transformEventToCard` logic, `NewsCard` rendering, empty state, keyboard nav (change ArrowLeft/Right to ArrowUp/Down)
- Remove dot indicators (not useful for vertical scroll with many items)
- Replace the "X of Y" counter with a subtle floating counter or remove it

### Specific Changes

1. **Remove**: `useEmblaCarousel` import and hook usage
2. **Remove**: Dot indicators section and counter
3. **Add**: Vertical scroll container with CSS scroll-snap:
   - Container: `overflow-y-auto snap-y snap-mandatory h-[calc(100vh-200px)]`
   - Each card wrapper: `snap-start h-[calc(100vh-280px)] min-h-[400px]`
4. **Update keyboard navigation**: ArrowUp/ArrowDown instead of ArrowLeft/ArrowRight
5. **Update `onSlideChange`**: Use an `IntersectionObserver` to detect which card is in view and report it back, replacing Embla's `onSelect` callback
6. **Keep**: `initialEventId` support via `scrollIntoView` instead of `emblaApi.scrollTo`
7. **Keep**: All card transformation logic, edit/share buttons, empty state

### No changes needed in `EventsAndMeetups.tsx`

The parent component already branches on `isMobile` and renders `<MobileEventCarousel>`. The props interface stays the same -- only the internal rendering changes from horizontal carousel to vertical scroll.

