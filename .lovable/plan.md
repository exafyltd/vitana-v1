

# Fix Duplicate Notifications + Simplify Appilix Path

## Changes

### 1. `public/firebase-messaging-sw.js` — Force SW activation
- Add `// SW v2` version comment at top for cache identification
- Add `install` event listener with `self.skipWaiting()` — activates new SW immediately instead of waiting for all tabs to close
- Add `activate` event listener with `self.clients.claim()` — takes control of existing tabs
- Keep existing dedup logic (already correct: skip `showNotification` when `payload.notification` exists, `recentTags` cache)

### 2. `src/lib/pushNotifications.ts` — Force SW update + Appilix metadata registration
- In `initialize()`: call `this.registration.update()` after SW registration to force browser to check for updated SW script
- In `subscribe()` for Appilix: skip the native token polling entirely, instead register device metadata (`device_type: 'appilix'`, `package_name: 'com.vitanaland.app'`) with the gateway via a new `registerAppilixDevice()` method — this gives the backend routing awareness without requiring an FCM token
- Still attempt web FCM as a fallback (harmless, may work in some WebViews)
- New `registerAppilixDevice()` calls the same `/api/v1/notifications/token` endpoint but sends `{ device_type: 'appilix', package_name: 'com.vitanaland.app', device_label: ... }` instead of `{ fcm_token: ... }` — the backend will need to handle this shape (documented below)

### 3. `src/lib/appilix.ts` — Remove dead code
- Remove `requestNativeFcmToken()` (the 10s polling + event listener machinery that never works)
- Keep `getNativeFcmToken()` as a simple synchronous check (harmless, 5 lines)
- Keep all other bridge functions (drawer, settings, status bar) unchanged

### 4. `src/App.tsx` — Remove retry chain
- Remove the `retryDelays` / 5s/10s/15s retry loop from `AppHooksInitializer`
- Simplify to just `initializePushNotifications()` on user login — one call, no retries

### 5. `index.html` — No changes
- Keep the existing early detection script (lightweight, harmless)

## Backend Investigation Summary

The `/api/v1/notifications/token` endpoint currently expects `{ fcm_token: string, device_label?: string }`. To support Appilix device metadata registration (no actual token), the gateway needs one of:

- **Option A**: Accept a new shape `{ device_type: 'appilix', package_name: 'com.vitanaland.app' }` on the same endpoint — store it as a device registration without an FCM token. When sending notifications, check if user has an Appilix device and route via FCM topic or Appilix API.
- **Option B**: Create a separate `/api/v1/notifications/device` endpoint for non-token registrations.

The frontend will POST the metadata. Whether the gateway currently rejects it (expects `fcm_token` to be non-null) depends on the gateway validation — that's outside this codebase. The frontend code will gracefully handle a rejection (log warning, don't crash).

For actual delivery to Appilix users, the gateway should use one of:
1. **Appilix Push Notification API** (if documented — needs investigation on appilix.com docs)
2. **FCM topic messaging** to the package-name topic (needs verification that Appilix subscribes devices to such a topic)
3. **Appilix dashboard API** (if they expose a programmatic endpoint behind their manual push UI)

This is a backend-side routing decision. The frontend metadata registration gives the gateway the information it needs regardless of which delivery method is chosen.

| File | Change |
|------|--------|
| `public/firebase-messaging-sw.js` | Add v2 + skipWaiting + clients.claim |
| `src/lib/pushNotifications.ts` | Force SW update, Appilix metadata registration, remove native token dependency |
| `src/lib/appilix.ts` | Remove dead `requestNativeFcmToken` polling |
| `src/App.tsx` | Remove 5s/10s/15s retry chain |

