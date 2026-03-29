
# Fix ORB Widget Loading Failure

## What I verified
- `AppLayout.tsx` still correctly imports and calls `useOrbVoiceWidget()`.
- `src/hooks/useOrbVoiceWidget.ts` still exists and is the only active ORB hook.
- `index.html` does **not** currently include a static `orb-widget.js` script tag.
- The current hook already injects the script dynamically, so this is not just a race-condition problem.
- The real failure is the script URL: `.env` sets `VITE_GATEWAY_URL=https://gateway-q74ibpv6ia-uc.a.run.app/api/v1`, but the hook builds:
  `https://gateway-q74ibpv6ia-uc.a.run.app/api/v1/command-hub/orb-widget.js`
  which is wrong.
- Console logs confirm the load failure: `[ORB] Failed to load orb-widget.js`.

## Implementation plan

### 1. Fix the gateway script base in `src/hooks/useOrbVoiceWidget.ts`
- Stop using `VITE_GATEWAY_URL` directly for the widget script path.
- Compute a clean widget host without `/api/v1` for loading `orb-widget.js`.
- Keep passing the correct API base to `VitanaOrb.init()` if the widget expects the gateway API URL separately.

### 2. Harden initialization in `src/hooks/useOrbVoiceWidget.ts`
- Replace the current one-shot `tryInit()` flow with a retry-based initializer like the version you proposed.
- Retry for a short window if `window.VitanaOrb` is not ready yet.
- Keep auth updates working after initialization.
- Preserve cleanup with `destroy()` on unmount.

### 3. Add the static script tag in `index.html`
- Add:
  `https://gateway-q74ibpv6ia-uc.a.run.app/command-hub/orb-widget.js`
- This gives the widget an early load path and removes dependence on React timing alone.
- Keep the hook defensive so it can initialize whether the script was loaded statically or is already present.

### 4. Avoid double-loading conflicts
- Update the hook so it:
  - initializes immediately if `window.VitanaOrb` already exists
  - does not inject a duplicate script if the static tag is present
  - only calls `init()` once per mount lifecycle

### 5. Verify expected result
- The ORB FAB should reappear on both desktop and mobile routes.
- No legacy React ORB components are reintroduced.
- The final setup remains:
  - `index.html` loads the external widget early
  - `useOrbVoiceWidget()` initializes it and syncs auth

## Technical notes
```text
Root cause hierarchy:
1. Bad script URL caused by using /api/v1 as the widget script base
2. Missing static script tag makes load timing less resilient
3. Current hook does not retry enough when VitanaOrb is not ready
```

```text
Recommended separation:
- Script URL host: https://gateway-q74ibpv6ia-uc.a.run.app
- API/init gatewayUrl: https://gateway-q74ibpv6ia-uc.a.run.app/api/v1
```
