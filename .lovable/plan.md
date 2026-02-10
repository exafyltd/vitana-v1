

# Fix: ORB "Failed to fetch" in Mobile App

## Root Cause

The `OrbVoiceClient` has a **hardcoded** gateway URL that differs from the correct one configured in the environment:

| Source | URL |
|--------|-----|
| `OrbVoiceClient.ts` (hardcoded, WRONG) | `https://gateway-86804897789.us-central1.run.app` |
| `.env` VITE_GATEWAY_BASE (CORRECT) | `https://gateway-q74ibpv6ia-uc.a.run.app` |

Every other module in the codebase (`devGatewayClient`, `taskApi`, `useTaskStream`, `CommandChat`) reads from `VITE_GATEWAY_BASE`. Only `OrbVoiceClient` bypasses this and uses a stale hardcoded URL, which fails inside the Appilix WebView.

## Fix

### Modify `src/lib/OrbVoiceClient.ts`

Replace the hardcoded gateway URL with the environment variable:

**Before (line 45):**
```typescript
private readonly GATEWAY_URL = 'https://gateway-86804897789.us-central1.run.app';
```

**After:**
```typescript
private readonly GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || 'https://gateway-q74ibpv6ia-uc.a.run.app';
```

This ensures:
- In production (published site + Appilix mobile app), it reads the correct URL from the build-time environment
- The fallback matches the `.env` default for safety

### No Other Files Need Changing

The `.env` already has the correct value:
```
VITE_GATEWAY_BASE=https://gateway-q74ibpv6ia-uc.a.run.app
```

This is baked into the Vite build and will be available in the published app and Appilix WebView.

## Why This Fixes the Mobile Issue

The Appilix WebView loads the published app from `vitana-v1.lovable.app`. When the ORB tries to reach `gateway-86804897789`, that endpoint either:
- Does not exist or is misconfigured for CORS from the published domain
- Is unreachable from the mobile network

Switching to `gateway-q74ibpv6ia-uc` (the correct gateway that already works for all other features) resolves the "Failed to fetch" error.

## Summary

| File | Change |
|------|--------|
| `src/lib/OrbVoiceClient.ts` | Replace hardcoded URL with `import.meta.env.VITE_GATEWAY_BASE` |

One line change. No new files, no new dependencies.

