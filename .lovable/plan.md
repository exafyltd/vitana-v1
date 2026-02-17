

## Fix Live Room Drawer: Status, Join, Participants, Share, and Bookmark

### Issues Identified

1. **"LIVE NOW" badge shown incorrectly** -- The drawer uses `room.isLive` which comes from the `community_live_streams` table status field. A room with status `pending` (scheduled, host hasn't started yet) still shows "LIVE NOW" because the `isLive` boolean is set solely by `stream.status === 'live'`. However, the drawer also falls into the `room.isLive` branch when displaying the "When" section. The real problem is that scheduled rooms with `status: 'pending'` get `isLive: false`, but the drawer condition `(room.isLive || isScheduled)` may not cover rooms that are neither live nor have a `scheduledTime`. Need to also use the `status` field for a more accurate badge.

2. **"Join Room" button doesn't navigate to the "Ready to join" screen** -- The `handleJoin` in the drawer calls `onJoin(room.id)` which maps to `handleJoinRoom` in LiveRooms.tsx. That function navigates to `/comm/live-rooms/${roomId}/view`. However, it only does this if the room data is found in `[...liveRooms, ...scheduledRooms]`. This should work, but the drawer also closes itself via `onOpenChange(false)`. The issue is likely that for a room with `isLive: false` (not yet started by host), the join button still appears because the drawer always shows "Join Room" when `room.isLive` is true.

3. **"People listening" shows nothing** -- `room.participants` maps to `stream.viewer_count`, which is `0` for rooms that haven't started. The label should also change to "People participating".

4. **Share button doesn't work** -- The drawer's share button calls `handleShare()` with no platform argument, which goes to the `else` branch that just shows a generic toast. It should use `SocialShareButton` or at least copy the link properly.

5. **Bookmark button doesn't work** -- The drawer uses local `isSaved` state with a toast, not the actual `useBookmarks` hook/`BookmarkButton` component.

### Changes

**File: `src/components/liverooms/LiveRoomDrawer.tsx`**

1. **Fix "LIVE NOW" badge**: Use `room.status` field alongside `room.isLive`. Only show "LIVE NOW" when `room.status === 'live'`. For rooms with `status === 'scheduled'` or `'pending'`, show the scheduled time or "Scheduled" label instead.

2. **Fix "People listening" label**: Change to "People participating". Show the count from `room.participants` and handle 0 gracefully with a "No one here yet" message.

3. **Fix Share button**: Replace the plain `handleShare()` call in the action bar with the `SocialShareButton` component which already supports `type="live_room"` and handles all platforms properly.

4. **Fix Bookmark button**: Replace the local `isSaved` / `handleSave` logic with the actual `BookmarkButton` component from `src/components/bookmarks/BookmarkButton.tsx`, passing `item_type: 'live_room'`.

5. **Fix Join button**: The join button should only show when the room is truly live (`room.status === 'live'`). For scheduled/pending rooms, show "Notify me" instead. The `onJoin` handler already navigates correctly.

### Detailed Line Changes

**Imports** (top of file): Add `BookmarkButton` and `SocialShareButton`, remove unused `Bookmark` and `Share2` icons.

**"People listening" section** (lines 367-385):
- Change label from "People listening" to "People participating"
- Show "No one here yet" when `room.participants === 0`

**"When" / LIVE NOW badge** (lines 406-410):
- Only show "LIVE NOW" when `room.status === 'live'` (not just `room.isLive`)
- For `status === 'scheduled'` or pending rooms without a scheduled time, show appropriate label

**Action bar** (lines 449-461):
- Replace `<Button onClick={() => handleShare()}>` with `<SocialShareButton type="live_room" ...>`
- Replace `<Button onClick={handleSave}>` with `<BookmarkButton item={{ item_type: 'live_room', item_id: room.id, item_name: room.title, item_image_url: room.imageUrl }}>`
- Style both as outline buttons matching the existing layout

**Remove dead code**: `handleSave`, `isSaved` state, and the generic `handleShare` branches that just show toasts.

### Files Changed

| File | Change |
|------|--------|
| `src/components/liverooms/LiveRoomDrawer.tsx` | Fix status badge logic, rename "People listening" to "People participating", wire real Share and Bookmark components, guard Join button on actual live status |

