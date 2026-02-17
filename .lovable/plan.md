

## Fix: Remove Inaccurate Viewer Count and White Bar on Desktop

### Problem
From the screenshot:
1. The header shows "0 watching" while Daily.co correctly shows "3 people in call" -- the custom viewer count is unreliable and redundant
2. The custom header and SubNavigation tabs ("Overview", "Events & MeetUps", "Live Rooms", "Media Hub") consume vertical space, pushing Daily.co's bottom controls below the visible area, creating a white bar/cutoff

### Solution

**File: `src/pages/community/LiveRoomViewer.tsx`**

**Change 1: Hide header on ALL devices when in-room (not just mobile)**

Currently the header is only hidden on mobile (`!(isMobile && isInRoom)`). Since Daily.co provides its own participant count ("3 people in call"), leave button, and settings, the custom header is redundant during active sessions on desktop too. Change the condition to hide it whenever `isInRoom` is true:

```tsx
{!isInRoom && (
  <div className="flex items-center justify-between p-4 border-b">
    ...
  </div>
)}
```

**Change 2: Remove "X watching" text entirely**

Remove the `viewerCounts` display (lines 253-256) since Daily.co already shows accurate participant data. Keep only the title and LIVE badge in the header (visible on the entry gate screen):

```tsx
<div className="flex items-center gap-2 mt-1">
  {isLive && (
    <Badge variant="destructive" className="animate-pulse">
      LIVE
    </Badge>
  )}
</div>
```

**Change 3: Hide SubNavigation when in-room on desktop**

The SubNavigation bar ("Overview | Events & MeetUps | Live Rooms | Media Hub") also takes space. Hide it when the user is actively in a room:

```tsx
{!isMobile && !isInRoom && <SubNavigation items={communityNavigation} />}
```

**Change 4: Use full height on desktop when in-room**

Adjust the container height so when both header and SubNavigation are hidden, the Daily.co iframe uses the maximum available space:

```tsx
<div className={cn(
  "flex flex-col",
  isInRoom
    ? (isMobile ? "h-[100dvh]" : "h-[calc(100vh-3rem)]")
    : "h-[calc(100vh-8rem)]"
)}>
```

The `3rem` accounts for the minimal AppLayout chrome (top border/padding) on desktop.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/community/LiveRoomViewer.tsx` | Hide header and SubNavigation when in-room on all devices; remove "X watching" count; adjust container height for desktop in-room |

### Result
- During active sessions: Daily.co fills the content area with no redundant header or navigation tabs -- its own "3 people in call" and controls are fully visible
- Entry gate screen: still shows room title, LIVE badge, back button, and SubNavigation as before
- Participant data comes exclusively from Daily.co (accurate, real-time)

