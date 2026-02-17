

## Fix: "Failed to create session" Toast Firing Before Retry Completes

### Root Cause

When `GoLivePopup` calls `createSession()` (via `mutateAsync`), if the gateway returns a 409 ROOM_NOT_IDLE error, two things happen simultaneously:

1. The `useCreateSession` hook's `onError` callback fires immediately, showing a "Failed to create session" toast
2. GoLivePopup's `catch` block catches the same error and starts the retry logic (cancel + DB reset + wait 1.5s + retry)

So the user sees the error toast even though the retry might succeed -- or at minimum, the retry is still in progress.

### Fix

**File: `src/hooks/useMyRoom.ts` -- `useCreateSession`**

Remove the `onError` toast from the mutation definition. Since GoLivePopup (the only caller) already handles errors with its own try/catch and retry logic, the mutation should not independently show error toasts.

```typescript
// Before:
onError: (error: Error) => {
  toast({
    title: 'Failed to create session',
    description: error.message,
    variant: 'destructive',
  });
},

// After: Remove onError entirely
// (GoLivePopup handles all error display after retry logic)
```

**File: `src/components/GoLivePopup.tsx` (around line 334-337)**

After the retry fails, show a more helpful error message that tells the user to just try again (since the DB reset already happened and should take effect on next attempt):

```typescript
// Update the retry-failed error message
} catch (retryError: any) {
  console.error('[GoLivePopup] Retry after force-reset failed:', retryError);
  notify.error('Error', 'Session reset in progress. Please close this popup and try again.');
  throw firstError;
}
```

Also add error display in the outer catch for non-409 errors (to replace the removed onError toast):

```typescript
} else {
  // Non-409 error: show toast here since mutation no longer does
  notify.error('Failed to create session', firstError.message);
  throw firstError;
}
```

### Summary

| File | Change |
|------|--------|
| `src/hooks/useMyRoom.ts` | Remove `onError` toast from `useCreateSession` -- let caller handle errors |
| `src/components/GoLivePopup.tsx` | Add explicit error toasts in the catch blocks (for non-409 and retry-failed cases) |

### Why This Fixes It

- No premature error toast on the first 409 (retry logic runs silently)
- If retry succeeds: user sees success, no confusing error flash
- If retry fails: user sees a helpful message telling them to try again
- Non-409 errors still show a toast (moved to GoLivePopup's catch block)
