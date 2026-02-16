

## Align Live Rooms Mobile Carousel with Events Pattern

### Problem
The mobile Live Rooms carousel uses a different card component (`LiveRoomCard`) and scroll behavior compared to the Events carousel (`NewsCard`). This creates visual inconsistency between the two community hubs.

### Key Differences to Fix

| Aspect | Events (current) | Live Rooms (current) |
|---|---|---|
| Card component | `NewsCard` | `LiveRoomCard` |
| `scrollSnapStop` | `normal` | `always` |
| Pull-to-refresh | Removed | Active |
| Share button | Top-right utility area | Bottom CTA row (inside LiveRoomCard) |

### Changes

**File: `src/components/community/MobileLiveRoomCarousel.tsx`**

1. **Replace `LiveRoomCard` with `NewsCard`**: Transform each room into `NewsCard` props (same pattern as `MobileEventCarousel.transformEventToCard`), mapping `room.title`, `room.description`, `room.imageUrl`, `room.host` to the NewsCard interface. The CTA button logic (Join/Notify/Manage) moves into `showSmartAction` or a custom `actionButton` on NewsCard.

2. **Move Share button to `utilityTopRight`**: Place the `SocialShareButton` in the top-right utility area alongside the kebab/edit controls, matching the Events pattern.

3. **Change `scrollSnapStop` from `'always'` to `'normal'`**: Enables smooth momentum-based scrolling in both directions.

4. **Remove pull-to-refresh**: Delete the pull-to-refresh state, touch handlers, and indicator UI. This matches the Events carousel which prioritizes scroll fluidity.

### Technical Detail

The room-to-NewsCard transformation will look similar to the event transformation:

```
title: room.title
description: room.description
imageUrl: room.imageUrl || fallback
category: 'community'
pillar: room.isLive ? 'LIVE' : 'SCHEDULED'
author: { name: room.host.name, avatar: room.host.avatar }
location: room.location || 'Virtual'
attendees: room.participants
timestamp: room.isLive ? 'LIVE' : formatted scheduledTime
price: room.isPremium ? 'Premium' : 'free'
utilityTopRight: <ShareButton /> + {isCreator && <KebabMenu />}
actionButton: <Join/Notify/Manage button>
```

The Join/Notify/Manage CTA remains as a custom `actionButton` on NewsCard (bottom-right), since Live Rooms need distinct actions (Join for live, Notify for scheduled) that differ from the event smart-action system.

### What Stays the Same
- All room data fetching, filtering, and state management in `LiveRooms.tsx`
- Desktop grid layout (unchanged)
- `LiveRoomCard` component itself (still used on desktop)
- Container height `calc(100dvh - 220px)`, snap-y, rounded-[26px], ring/shadow styling
- Empty state rendering
- Keyboard navigation (arrow keys)
- IntersectionObserver for slide tracking

