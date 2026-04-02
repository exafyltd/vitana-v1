

# Redesign Mobile Shorts as Immersive Card Feed

## Summary

Replace the current small 2-column grid + CTA button layout for Shorts on mobile with a single-column vertical snap-scroll feed of immersive `NewsCard`-based media cards — following the same "one dominant card per viewport" pattern used on Events and Live Rooms.

## Changes

### 1. New component: `src/components/community/MobileShortsCarousel.tsx`

Create a new carousel component modeled directly on `MobileEventCarousel.tsx`:

- Accepts `shorts` array (same shape as `videoShorts`), `onShortClick`, `onOpenFeed` callbacks
- Vertical snap-scroll container with `height: calc(100dvh - 190px)` (same as Events)
- Each short renders as a `NewsCard` with:
  - `imageUrl` = `thumbnail_url || thumbnailImage`
  - `title` = short title
  - `description` = short description or creator name
  - `author` = `{ name: creator, avatar: creatorAvatar }`
  - `category` = `'video'`
  - Utility top-right: play button or kebab menu
  - Badge overlay showing duration
- Same snap behavior, IntersectionObserver for active index, scale/opacity transitions
- `rounded-[26px]`, same shadow and ring as Events cards
- Tapping a card opens the immersive `MobileShortsFeed` at that index
- Empty state matching Events pattern (compact, sits high)

### 2. Update `src/pages/community/MediaHub.tsx` — Replace mobile Shorts content

**Lines 743-798** (the current mobile Shorts block): Replace the entire `isMobile` branch inside `SplitBarContent value="shorts"` with:

```tsx
<MobileShortsCarousel
  shorts={videoShorts}
  onShortClick={(index) => {
    setSelectedVideoIndex(index);
    setMobileShortsFeedOpen(true);
  }}
/>
```

This removes:
- The "34 shorts available" text label
- The gradient CTA button
- The 2-column preview grid
- The "View all shorts" ghost button

All replaced by the immersive single-column card feed that starts immediately below the mode tabs.

### Files changed
1. `src/components/community/MobileShortsCarousel.tsx` — New component (modeled on `MobileEventCarousel`)
2. `src/pages/community/MediaHub.tsx` — Swap mobile shorts block to use new carousel

### What stays the same
- Desktop Shorts layout untouched
- Music and Podcasts tabs untouched
- Compact title, utility rail, and mode tab row preserved
- `MobileShortsFeed` (full-screen immersive TikTok-style playback) still used when a card is tapped
- All existing data flow (`videoShorts`, `useShorts` hook) unchanged

