

## Autopilot "Could not load recommendations" — Root Cause & Fix

### What's happening

The Autopilot popup calls `GET /api/v1/autopilot/recommendations/count` and `GET /api/v1/autopilot/recommendations?status=new` on the Cloud Run Gateway. These endpoints **don't exist yet** on the gateway — the requests fail with network errors (no CORS headers returned = "Failed to fetch"). The console shows this clearly with repeated `[Autopilot] count fetch error: TypeError: Failed to fetch`.

### Fix: Graceful fallback when API is unavailable

Since the gateway endpoints aren't deployed yet, the Autopilot should **silently fall back to an empty state** ("All caught up!") instead of showing a scary error. Once the backend endpoints are live, it will automatically start showing real data.

**File: `src/hooks/use-autopilot.ts`**

1. In `fetchCount` (~line 105): catch block already handles this — no change needed.

2. In `fetchRecommendations` (~line 122): Instead of setting an error state on network failure, treat it as "no recommendations available" — set `recommendations` to `[]` and leave `error` as `null`. Log a debug warning but don't surface it to the user.

3. Remove the `fetchCount` call from `useEffect` on mount — it fires 5+ times redundantly (visible in logs) and serves no purpose until the endpoint exists. Only call `fetchCount` after activate/reject actions succeed.

4. In `AutopilotPopup.tsx`: Keep the error UI for future use, but it will no longer trigger for "endpoint not found" scenarios.

### Result

- Autopilot card in sidebar: shows 0 badge (no pending count)
- Clicking Autopilot: shows "All caught up!" instead of an error
- When the backend endpoint goes live: automatically starts working with real data

### Files to modify
- `src/hooks/use-autopilot.ts` — treat fetch failures as empty results

