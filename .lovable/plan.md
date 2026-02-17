

## Fix: Gateway State Desync + Rate Limit on Retry

### Problem

The gateway has stale session state that disagrees with the database. When the user deleted the previous session directly, the gateway wasn't notified, creating a permanent conflict:
- Gateway says "room not idle" (409) on create
- Gateway says "no active session" (409) on cancel
- Retry after DB reset hits rate limit (429) because 1.5s is too fast

### Changes

**File: `src/components/GoLivePopup.tsx`**

1. Increase the propagation delay from 1.5s to 3s to avoid the 429 rate limit
2. Handle 429 errors specifically in the retry catch -- wait longer and retry once more
3. Add the gateway's `/rooms/:id/force-reset` endpoint call (or equivalent) if available, otherwise ensure the DB reset is sufficient

```text
Current flow:
  Create (409) --> Cancel (409) --> DB Reset --> Wait 1.5s --> Retry (429 RATE_LIMIT)

Fixed flow:
  Create (409) --> Cancel (409, ignored) --> DB Reset --> Wait 3s --> Retry
  If retry gets 429 --> Wait 5s --> Final retry
```

**Specific changes:**

1. **Increase wait time** (line 331): Change `1500` to `3000` ms to avoid rate limiting

2. **Add 429 handling in retry catch** (lines 334-338): If the retry fails with 429, wait 5 more seconds and try one final time instead of immediately giving up

3. **Improve user feedback**: Show "Resetting room, please wait..." as a loading state instead of failing silently

### Technical Details

| File | Change |
|------|--------|
| `src/components/GoLivePopup.tsx` | Increase retry delay from 1.5s to 3s; add 429 rate-limit handling with a second retry after 5s; improve error messaging |

### Why This Fixes It

- The 3s delay gives the gateway time to process the DB state change and avoids the rate limiter
- If 429 still hits, the 5s second-chance retry almost certainly clears the rate window
- The user sees a "resetting" state instead of an error, matching the actual behavior
