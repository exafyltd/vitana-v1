

## Remove Reaction Bar Blocking Daily.co Controls

### Problem
A custom reaction bar (Heart, Like, End Room buttons) renders below the Daily.co video iframe, creating a white strip that covers Daily.co's built-in control toolbar (camera, mic, screen share, chat, leave).

### Solution
Remove the entire reaction bar block (lines 344-376) from `LiveRoomViewer.tsx`. Daily.co already provides:
- Camera/mic toggle
- Screen share
- Chat
- Leave button (configured via `showLeaveButton: true` in `DailyVideoRoom.tsx`)

The "End Room" host action will be handled by Daily's built-in leave button combined with the existing `onLeft` callback, which already calls `handleLeaveRoom()` and triggers the gateway end-room flow for hosts.

### File: `src/pages/community/LiveRoomViewer.tsx`

1. **Remove the reaction buttons block** (the `div` with `p-4 border-t bg-background/95` containing Heart, Like, and End Room buttons)
2. **Remove unused imports**: `Heart`, `ThumbsUp` from lucide-react
3. **Remove the `handleReaction` function** and the `sendReaction` / `useLiveChat` hook call (no longer needed without reaction buttons)
4. The video container keeps `flex-1` so it fills the full remaining height with no bottom bar

### What stays
- The header bar (back arrow, title, LIVE badge, viewer count, share/settings)
- The full-width Daily.co iframe filling all space below the header
- The `onLeft` callback on `DailyVideoRoom` which already handles host end-room logic

