

## Fix: "Failed to create stream" -- ROOM_NOT_IDLE retry not triggering

### Root Cause

The Gateway returns a `409` with `{"error":"ROOM_NOT_IDLE","message":"Room already has an active session"}`. The `GoLivePopup` retry logic checks for `'409'` or `'ROOM_NOT_IDLE'` in the error message string. However, the `apiFetch` utility in `liveRoomService.ts` throws only the Gateway's `message` field:

```
"Room already has an active session"
```

This string does NOT contain `'409'` or `'ROOM_NOT_IDLE'`, so the retry branch never executes and the generic error toast fires instead.

### Fix

**File: `src/services/liveRoomService.ts` (line 222)**

Update `apiFetch` to include the HTTP status code and error code in the thrown error message, so downstream retry logic can pattern-match on them:

```typescript
// Before:
throw new Error(error.message || error.error || `Request failed: ${response.status}`);

// After:
const msg = error.message || error.error || 'Request failed';
throw new Error(`${msg} [${response.status} ${error.error || ''}]`.trim());
```

This produces errors like: `"Room already has an active session [409 ROOM_NOT_IDLE]"` -- which the existing retry logic in `GoLivePopup` already matches correctly.

### Why This Broke

This likely regressed during an earlier refactor of `apiFetch`. The memory notes confirm this pattern was supposed to be in place but the actual code diverged.

### Summary

| File | Change |
|------|--------|
| `src/services/liveRoomService.ts` | Append HTTP status + error code to thrown error messages in `apiFetch` |

Single-line fix. No other files need changes -- the retry logic in `GoLivePopup` already handles `409`/`ROOM_NOT_IDLE` correctly once it can detect them.

