

## Fix: Use Gateway `/end` Instead of `/cancel` to Clear Stuck Sessions

### Root Cause

The retry logic calls `/cancel` when the gateway says ROOM_NOT_IDLE, but `/cancel` only works for **scheduled** sessions. The gateway thinks there's an **active** session, so it responds with NO_ACTIVE_SESSION to the cancel call. The DB reset that follows doesn't affect the gateway's in-memory state, so every retry still gets ROOM_NOT_IDLE.

```text
Current (broken) flow:
  Create (409 ROOM_NOT_IDLE)
  --> Cancel (409 NO_ACTIVE_SESSION -- wrong endpoint!)
  --> DB reset (ignored by gateway)
  --> Retry (409 ROOM_NOT_IDLE -- gateway unchanged)

Fixed flow:
  Create (409 ROOM_NOT_IDLE)
  --> End room via gateway (clears gateway in-memory state)
  --> DB reset (safety net)
  --> Wait 3s --> Retry (should succeed)
```

### Changes

**File: `src/components/GoLivePopup.tsx` (lines 301-306)**

Replace the gateway `cancelRoom` call with `endRoom`, which properly clears the gateway's in-memory active session state:

```typescript
// Before:
await import('@/services/liveRoomService').then(m =>
  m.liveRoomService.cancelRoom(effectiveRoomId, user.id)
);

// After:
await import('@/services/liveRoomService').then(m =>
  m.liveRoomService.endRoom(effectiveRoomId)
);
```

The `endRoom` endpoint tells the gateway "this active session is over" -- which is exactly the state the gateway thinks the room is in. This clears the in-memory lock, so the subsequent retry can create a new session successfully.

### Why Previous Fixes Didn't Work

- The `apiFetch` error format fix was correct (error detection works now)
- The `onError` toast removal was correct (no premature toasts)
- The 3s delay was correct (avoids rate limiting)
- But the actual **reset action** was wrong: calling `/cancel` on an "active" session does nothing on the gateway side

### Summary

| File | Change |
|------|--------|
| `src/components/GoLivePopup.tsx` | Replace `cancelRoom()` with `endRoom()` in the 409 retry handler |

Single-line fix. The gateway's `/end` endpoint is already available in `liveRoomService.ts`.

