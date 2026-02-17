

## Fix: White Header Covering Daily.co Controls on Mobile

### Problem
From the screenshot, the mobile live room view shows:
1. A white header bar ("Jovana's Session", LIVE badge, share/mute icons) sitting above the video
2. Large empty white space below the video
3. The Daily.co iframe is squeezed into a small area, not using the full viewport

The header takes up significant vertical space, and the height calculation `h-[calc(100vh-8rem)]` reserves space for elements that are no longer visible (bottom nav, sub-navigation).

### Solution

Two changes in `src/pages/community/LiveRoomViewer.tsx`:

**1. Hide the header on mobile when in-room**

When the user has joined the room (`isInRoom === true`), the custom header (back arrow, title, LIVE badge, share/settings buttons) should be hidden on mobile. Daily.co already provides its own "Leave" button and controls, making the custom header redundant during an active session.

```tsx
{/* Header - hide on mobile when in room */}
{!(isMobile && isInRoom) && (
  <div className="flex items-center justify-between p-4 border-b">
    ...existing header content...
  </div>
)}
```

**2. Use full viewport height on mobile when in-room**

Change the container height to use the full dynamic viewport on mobile during active sessions, since both the bottom nav and header are hidden:

```tsx
<div className={cn(
  "flex flex-col",
  isMobile && isInRoom 
    ? "h-[100dvh]"
    : "h-[calc(100vh-8rem)]"
)}>
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/community/LiveRoomViewer.tsx` | Conditionally hide header on mobile when in-room; use full `100dvh` height on mobile |

### Result
- On mobile during a live session: the Daily.co iframe fills the entire screen with no white header or empty space
- On desktop: no changes, header remains visible
- Before joining (entry gate screen): header still shows on all devices so users see the room title

