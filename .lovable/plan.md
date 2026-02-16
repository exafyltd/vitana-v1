

## Status: The fix is already applied -- adding debug logging to find the real blocker

The three-tier `dailyRoomUrl` resolution (lines 139-142 of `LiveRoomViewer.tsx`) was already applied in the previous edit. The code currently reads:

```typescript
const dailyRoomUrl = navDailyRoomUrl 
  || ((roomState?.room?.metadata as Record<string, unknown>)?.daily_room_url as string | null)
  || dailyRoomUrlFromDb
  || null;
```

Since viewers still can't join despite the gateway returning the URL, the issue is likely one of:
- The gateway `getRoomState` call is failing for viewers (auth issue, 401/403)
- `roomState` is populated but `metadata` is nested differently than expected
- The `useRoomState` hook's `enabled` condition isn't met for viewers

### Plan

**File: `src/pages/community/LiveRoomViewer.tsx`**

Add a `useEffect` debug log right after `dailyRoomUrl` is derived (after line 142) to trace exactly what each source contains:

```typescript
useEffect(() => {
  console.log('[LiveRoomViewer] dailyRoomUrl debug:', {
    navDailyRoomUrl,
    roomStateMetadata: roomState?.room?.metadata,
    dailyRoomUrlFromDb,
    resolved: dailyRoomUrl,
    roomStateExists: !!roomState,
    roomId,
  });
}, [navDailyRoomUrl, roomState, dailyRoomUrlFromDb, dailyRoomUrl, roomId]);
```

This will confirm whether:
1. `roomState` is null (gateway call failing for viewers)
2. `roomState.room.metadata` exists but the key is named differently
3. The URL is resolved but something else blocks rendering

Once we see the console output, we can pinpoint the exact blocker and fix it in one shot.

### Technical Notes
- No other files need changes
- The debug log can be removed after confirming the fix works
- If the gateway call fails for viewers, the fix would be in `apiFetch` auth handling, not in this component
