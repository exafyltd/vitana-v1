

## Fix Autopilot API Integration

### Problem

The autopilot hook uses `VITE_GATEWAY_BASE` with a manual `/api/v1` append, and silently swallows all fetch errors (showing "All caught up!" instead of surfacing the real issue). The user confirms the API exists and is deployed.

### Changes

**File: `src/hooks/use-autopilot.ts`**

1. Replace the gateway URL construction to match the pattern used elsewhere:
   ```typescript
   const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "";
   ```
   Then use `${GATEWAY_URL}/autopilot/recommendations/...` for all endpoints (since `VITE_GATEWAY_URL` already includes `/api/v1`).

2. Revert the silent error suppression in `fetchRecommendations` — set the error state properly so the error UI renders (the API exists, so errors should be visible for debugging):
   ```typescript
   } catch (e: any) {
     console.error("[Autopilot] fetch error:", e.message);
     setError(e.message || "Failed to load");
   }
   ```

3. Re-enable `fetchCount` on mount so the badge count is fetched when the hook initializes.

**No changes needed to `AutopilotPopup.tsx`** — it already has proper loading, error, and empty states.

### Files to modify
- `src/hooks/use-autopilot.ts`

