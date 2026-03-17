

## Plan: Restore WebView Notification Fallback for Appilix

### Root Cause

The realtime handler in `useNotifications.ts` receives new `user_notifications` via Supabase Realtime and updates React state (badge count, list), but **never triggers a browser Notification**. The `notifyNewMessage()` function exists in `pushNotifications.ts` but is never called from anywhere. This is the missing link — the old behavior likely called `new Notification()` or the service worker's `showNotification()` when a realtime event arrived while the document was hidden.

### What Changes

**File 1: `src/hooks/useNotifications.ts`**

In the realtime `INSERT` handler (line 91-96), after updating state, call a new helper that shows a browser notification if:
- Running inside Appilix (`isAppilix()`)
- Document is hidden (`document.hidden === true`)
- The notification is a `new_chat_message` type
- The notification has not already been shown (dedup by `data.message_id`)
- The user is NOT currently viewing that specific chat thread (check `window.location` for matching thread param)

The helper will use the `Notification` constructor directly (no service worker required — simpler and works in Appilix WebView). Falls back to `ServiceWorkerRegistration.showNotification()` if available.

**File 2: `src/lib/appilixNotificationFallback.ts`** (new file)

A small, focused module:
- `showAppilixFallbackNotification(notif: VitanaNotification): void`
- Checks: `isAppilix()`, `document.hidden`, dedup set, not-current-thread
- Requests `Notification.permission` if not yet granted (Appilix WebView should auto-grant)
- Shows `new Notification(title, { body, tag, data })` with click handler navigating to `/inbox?thread=...`
- Dedup: maintains a `Set<string>` of shown `message_id` values, auto-clears after 30 seconds
- Scoped to Appilix only — does nothing if `isAppilix()` is false

### Notification Content
- **Title**: `notif.title` (already set to sender name by the DB trigger)
- **Body**: `notif.body` (already set to message preview by the DB trigger)
- **Tag**: `message-${data.message_id}` (prevents OS-level duplicates)
- **Click**: Navigate to `/inbox?thread=${data.sender_id}`

### Dedup Strategy
1. **Application-level**: `Set<string>` keyed on `data.message_id`, entries expire after 30s
2. **OS-level**: `tag` parameter on the Notification — same tag replaces previous notification
3. **Visibility check**: Skip entirely if document is visible and focused
4. **Thread check**: Skip if URL contains `thread=${sender_id}` (user is looking at that conversation)

### What Does NOT Change
- No changes to the service worker files
- No changes to `pushNotifications.ts` FCM/gateway flow
- No changes to the DB trigger
- No changes to the long-term native push architecture

### Limitations
- Only works while the Appilix WebView process is alive (Android may kill it after ~5 minutes in background)
- Not a true native push — won't wake the app from a killed state
- Depends on Appilix WebView supporting the `Notification` API (most Chromium-based WebViews do)
- This is explicitly a bridge/fallback until the proper Appilix push API integration is built

### Test Steps
1. Open the Appilix app, log in as the test user
2. Navigate to any page (not inbox)
3. Switch to another app (background the Appilix app)
4. From a second account, send a DM to the test user
5. Within a few seconds, a notification should appear with sender name + message preview
6. Tap the notification → should open the app to `/inbox`
7. Repeat while the inbox is open viewing a different thread → notification should appear
8. Repeat while viewing the exact same sender's thread → notification should NOT appear

