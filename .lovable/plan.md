

## Plan: Restore Web FCM/Service Worker Path in Appilix

### Problem

Two blocks in `src/lib/pushNotifications.ts` prevent the standard web push flow from running inside Appilix:

1. **`initialize()` lines 42-45**: Early return when `isAppilix()` and `!this.isSupported`, skipping SW registration entirely
2. **`subscribe()` lines 73-104**: 30-second polling loop for a native Appilix FCM token that never arrives, followed by `return null` — the web FCM path on lines 108-120 is never reached

### Changes to `src/lib/pushNotifications.ts`

**Change 1 — `initialize()` (lines 41-47):**
Remove the Appilix early return. If `this.isSupported` is false (no SW support), return false regardless of Appilix. If `this.isSupported` is true, proceed to register the service worker normally — Appilix's Chromium WebView supports it.

Replace:
```typescript
if (!this.isSupported) {
  if (isAppilix()) {
    console.log('[Push] Appilix detected — SW not supported...');
    return true;
  }
  return false;
}
```
With:
```typescript
if (!this.isSupported) {
  console.warn('[Push] Service Worker or Notification API not supported');
  return false;
}
```

**Change 2 — `subscribe()` (lines 73-105):**
Replace the 30-second polling block with: (a) one instant check for native token, (b) fire-and-forget Appilix metadata registration, (c) fall through to web FCM immediately.

Replace lines 73-105 with:
```typescript
if (isAppilix()) {
  console.log('[Push] Appilix detected — checking native token once, then proceeding to web FCM');
  const nativeToken = getNativeFcmToken();
  if (nativeToken) {
    console.log('[Push] ✅ Native Appilix FCM token found, using it');
    token = nativeToken;
  }
  // Register device metadata in background (non-blocking)
  this.registerAppilixDevice(nativeToken || undefined).catch(() => {});
}
```

The existing web FCM block on lines 108-120 then runs as normal (even for Appilix), obtaining a web push token via the service worker.

**Change 3 — `initialize()` catch block (lines 58-63):**
Remove the Appilix special case that returns `true` when SW registration fails — let it return `false` so the failure is honest.

### No other files change

### What this restores

```
App loads → SW registers → web FCM token obtained → token sent to gateway
→ chat message → DB trigger → gateway sends FCM → SW push event → showNotification()
```

### Test steps

1. Deploy, open in Appilix app
2. Console should show: `[Push] Service Worker registered` then `[Push] ✅ Web FCM token obtained` then `[Push] ✅ Token registered with backend`
3. Background the app
4. Send a DM from another account
5. Android notification should appear (bell-style, like March 12 screenshot)
6. Tap notification → opens inbox

