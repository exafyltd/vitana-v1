

## Fix: Autopilot CORS Failure — `X-User-ID` Header Triggers Preflight Block

### Root Cause

The `X-User-ID` custom header in autopilot requests triggers a CORS **preflight** (OPTIONS) request. The Gateway's autopilot routes don't include `X-User-ID` in their `Access-Control-Allow-Headers` response, so the browser blocks the actual GET/POST.

Evidence: `GET /api/v1/chat/conversations` succeeds (200) on the **same gateway** with the **same JWT** — but chat does NOT send `X-User-ID`. The autopilot requests are the only ones adding this header, and they all fail with "Failed to fetch".

### Fix

**File: `src/hooks/use-autopilot.ts`** — Remove `X-User-ID` from `getAuthHeaders()`

The gateway can extract the user ID from the JWT `sub` claim (standard practice). The custom header is unnecessary and is the sole cause of the CORS block.

```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
```

Also: add a debounce guard to `fetchCount` to prevent the 15+ redundant calls visible in the network log (the hook is instantiated by multiple components).

### Files to modify
- `src/hooks/use-autopilot.ts` — remove `X-User-ID` header, add fetch dedup

