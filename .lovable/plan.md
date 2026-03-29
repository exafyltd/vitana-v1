

# Fix ORB double `/api/v1` path causing 404

## Problem
The ORB widget receives `gatewayUrl = "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1"` but internally appends its own `/api/v1/orb/live/session/start`, producing the doubled path `/api/v1/api/v1/...` which returns 404.

## Fix
In `src/hooks/useOrbVoiceWidget.ts`, change line 5 to pass the **host-only** base URL to the widget, not the full `/api/v1` URL:

```ts
const GATEWAY_HOST = "https://gateway-q74ibpv6ia-uc.a.run.app";
const GATEWAY_URL = GATEWAY_HOST;
```

Remove the `import.meta.env.VITE_GATEWAY_URL` fallback since that env var includes `/api/v1` which the widget adds itself. Use the raw host constant directly.

## File
- `src/hooks/useOrbVoiceWidget.ts` -- line 5 only

