

## Fix: "Failed to join video room" Error

### Root Cause

The `DailyVideoRoom` component's `call.join()` call is failing, but the actual Daily.co error message is being discarded -- replaced with a generic "Failed to join video room" string. This makes debugging impossible.

The most likely cause is that the Daily.co room has expired or been deleted since it was created. Daily.co rooms created without explicit expiry settings are temporary and may have been cleaned up. When the user clicks into a "LIVE" room card, the stored `daily_room_url` in the room metadata points to a room that no longer exists on Daily.co's servers.

### Changes

**File: `src/components/liverooms/DailyVideoRoom.tsx` (line 75-79)**

Pass the actual error details through instead of a generic message, so the toast shows actionable information:

```tsx
// Before:
call.join({ url: roomUrl }).catch((err) => {
  if (!destroyed) {
    console.error('[Daily] Failed to join:', err);
    onError?.('Failed to join video room');
  }
});

// After:
call.join({ url: roomUrl }).catch((err) => {
  if (!destroyed) {
    console.error('[Daily] Failed to join:', err);
    const msg = err?.message || err?.errorMsg || String(err);
    onError?.(`Failed to join video room: ${msg}`);
  }
});
```

**File: `src/pages/community/LiveRoomViewer.tsx` (lines 298-328)**

Add a retry mechanism: when `DailyVideoRoom` reports an error, attempt to re-create the Daily room via the gateway and update the URL. This handles expired/deleted rooms automatically:

- Add a `dailyError` state and a `retryCount` state
- On error, if host: call `liveRoomService.createDailyRoom(roomId)` to provision a fresh room
- On error, if viewer: show a "Retry" button that re-fetches the room state to get the latest URL
- Limit retries to 1 automatic attempt to avoid infinite loops

**File: `src/pages/community/LiveRoomViewer.tsx`**

Add state variables and a retry handler:

```tsx
const [dailyError, setDailyError] = useState<string | null>(null);
const [retryCount, setRetryCount] = useState(0);

const handleDailyError = async (err: string) => {
  console.error('[Daily] Error:', err);
  
  // Auto-retry once: re-create Daily room (host) or re-fetch URL (viewer)
  if (retryCount === 0 && roomId) {
    setRetryCount(1);
    try {
      if (effectiveIsHost) {
        const result = await liveRoomService.createDailyRoom(roomId);
        // Force re-fetch room state to pick up new URL
        queryClient.invalidateQueries({ queryKey: ['live-room-host', roomId] });
        queryClient.invalidateQueries({ queryKey: ['room-state', roomId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['room-state', roomId] });
      }
      // Brief delay then component re-mounts with new URL
      return;
    } catch (retryErr) {
      console.error('[Daily] Retry failed:', retryErr);
    }
  }
  
  setDailyError(err);
  toast({ title: 'Video error', description: err, variant: 'destructive' });
};
```

Update the `DailyVideoRoom` usage to use the new handler and add a manual retry UI when auto-retry fails.

### Summary

| File | Change |
|------|--------|
| `src/components/liverooms/DailyVideoRoom.tsx` | Pass real error details instead of generic message |
| `src/pages/community/LiveRoomViewer.tsx` | Add auto-retry: re-create Daily room on failure, manual retry button as fallback |

### Technical Notes
- The auto-retry only fires once to prevent loops
- Host auto-retry creates a fresh Daily room via gateway
- Viewer auto-retry invalidates queries to get the updated URL
- A manual "Retry" button appears if auto-retry also fails
