

## Fix: FCM Token Refresh Not Re-registering with Gateway

### Root Cause

Firebase periodically rotates FCM tokens. The current code only registers the token once during `initializePushNotifications()`. If the token changes (common on mobile after app restart, SW update, or Firebase-initiated rotation), the gateway holds a stale token and push delivery silently fails.

Additionally, `onForegroundMessage` in `firebase.ts` has a subtle race condition — it returns a cleanup function synchronously but sets `unsubscribe` asynchronously, so early cleanup calls are no-ops.

### Changes

**1. `src/lib/firebase.ts`** — Add `onTokenRefresh` listener

Firebase's `onMessage` already handles foreground messages, but there's no listener for token refresh. Add an `onTokenRefresh` callback using Firebase's `getToken` with `serviceWorkerRegistration` to detect rotations:

```typescript
export async function requestFCMToken(swRegistration?: ServiceWorkerRegistration): Promise<string | null> {
  // Pass swRegistration to getToken so Firebase uses the correct SW
  const token = await getToken(messaging, { 
    vapidKey: VAPID_KEY, 
    serviceWorkerRegistration: swRegistration 
  });
}
```

Fix the `onForegroundMessage` race by awaiting the messaging instance before returning:
```typescript
export async function onForegroundMessage(callback): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  return onMessage(messaging, callback);
}
```

**2. `src/lib/pushNotifications.ts`** — Handle token refresh

In the `subscribe()` method, after initial token registration, set up a periodic token check (every 30 minutes) that re-registers if the token changed. Also pass the SW registration to `requestFCMToken`:

```typescript
// In subscribe(), after initial registration:
this.startTokenRefreshMonitor();

private startTokenRefreshMonitor(): void {
  if (this.refreshInterval) return;
  this.refreshInterval = setInterval(async () => {
    try {
      const newToken = await requestFCMToken(this.registration);
      if (newToken && newToken !== this.fcmToken) {
        console.log('[Push] FCM token rotated, re-registering...');
        this.fcmToken = newToken;
        await this.registerTokenWithBackend(newToken);
      }
    } catch {}
  }, 30 * 60 * 1000); // 30 minutes
}
```

Also fix `setupForegroundHandler` to await the now-async `onForegroundMessage`.

**3. `src/App.tsx`** — No changes needed

The initialization is already correctly gated.

### Summary of changes
- `src/lib/firebase.ts`: Fix `onForegroundMessage` race condition, accept SW registration in `requestFCMToken`
- `src/lib/pushNotifications.ts`: Add 30-min token refresh monitor, pass SW registration, fix async foreground handler setup

