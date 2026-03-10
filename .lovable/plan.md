

# Fix: Duplicate Notifications + Appilix App Push

## Two separate issues

### Issue 1: Duplicate notifications (can fix now)

When your backend sends an FCM message with a `notification` payload, the browser **automatically** displays it. Then our service worker's `onBackgroundMessage` fires and calls `showNotification` **again** — creating a duplicate.

**Fix in `public/firebase-messaging-sw.js`**: Skip `showNotification` when the payload already contains a `notification` field (the browser handles it). Only show manually for data-only messages.

### Issue 2: No notification in Appilix app (configuration issue)

The Custom JS approach (`firebase.messaging().getToken()`) won't work because Appilix doesn't expose its internal Firebase SDK to injected JavaScript. The app handles FCM internally at the native level.

Appilix's push system works differently — it subscribes all app installs to FCM via its own native code. To send notifications to the app, you need to either:
- Use **Appilix's built-in notification panel** to broadcast
- Or configure your **backend to send FCM messages to the Appilix topic** (typically the package name `com.vitanaland.app`)

This is a backend/Appilix configuration task, not a frontend code fix. I can update the gateway edge function to also send to the Appilix FCM topic when dispatching notifications — but first we need to confirm the topic name in the Appilix dashboard.

## Code changes

### `public/firebase-messaging-sw.js`
- When `payload.notification` exists, skip `showNotification` (browser already shows it)
- Only call `showNotification` for data-only payloads
- Add a consistent `tag` based on message ID to deduplicate any remaining edge cases

### `src/lib/pushNotifications.ts`  
- In the foreground handler, use `tag` from the payload data to prevent duplicate local notifications

| File | Change |
|------|--------|
| `public/firebase-messaging-sw.js` | Skip duplicate notification display for notification-payload messages |
| `src/lib/pushNotifications.ts` | Add tag-based deduplication in foreground handler |

