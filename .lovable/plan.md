

## Investigation: Triple Notifications on Mobile

### How notifications are reaching the device

Three independent notification delivery paths all fire for the same incoming chat message:

```text
Message inserted into chat_messages
         │
         ├── Path 1: DB Trigger → user_notifications → trg_appilix_push → Appilix Push API → Native OS notification
         │
         ├── Path 2: FCM Web Push → firebase-messaging-sw.js → Service Worker showNotification
         │
         └── Path 3: Realtime subscription (useNotifications.ts) → showAppilixFallbackNotification() → Browser Notification API / SW showNotification
```

Each path has its own deduplication logic (different tags, different TTLs, different scopes), so they don't suppress each other. The result: 3 notifications for 1 message.

### Why it started working

The Appilix push trigger (`trg_appilix_push`) was added recently. Combined with the existing FCM web push and the browser fallback, it created three parallel paths.

### Fix: Disable redundant paths on Appilix

The proper notification channel for Appilix mobile is **Path 1** (Appilix Push API via `trg_appilix_push`). The other two are redundant on that platform:

**1. `src/lib/appilixNotificationFallback.ts`** — Skip when Appilix native push is active

Add an early return when running inside the Appilix WebView. The native push (Path 1) already handles delivery. This fallback was a stopgap before `trg_appilix_push` existed.

```typescript
import { isAppilix } from '@/lib/appilix';

export async function showAppilixFallbackNotification(notif) {
  // Native push now handles Appilix notifications via trg_appilix_push
  if (isAppilix()) {
    console.log('[NotifFallback] Skipped: Appilix native push active');
    return false;
  }
  // ... rest unchanged
}
```

**2. `src/lib/pushNotifications.ts`** — Skip FCM foreground handler inside Appilix

The `setupForegroundHandler` method shows a local notification via FCM's `onForegroundMessage`. Inside the Appilix WebView, FCM web tokens are unreliable anyway, but when they do fire, they duplicate the native push. Add an `isAppilix()` guard:

```typescript
private async setupForegroundHandler(): Promise<void> {
  if (this.foregroundCleanup) return;
  if (isAppilix()) return; // Native push handles this
  // ... rest unchanged
}
```

**3. `public/firebase-messaging-sw.js`** — No change needed

The service worker `push` event only fires when an FCM push arrives. If the FCM token isn't registered on Appilix (which is the intended state), this path is already inactive. No change needed.

### Summary

- Path 1 (Appilix Push API) = **keep** — this is the correct native channel
- Path 2 (FCM foreground handler) = **disable on Appilix** — 1 line guard
- Path 3 (browser fallback) = **disable on Appilix** — 1 line guard

Two small changes, two files. Notifications will be single-delivery on Appilix mobile while desktop/PWA behavior remains unchanged.

