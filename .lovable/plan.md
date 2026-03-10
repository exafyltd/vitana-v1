

# Fix Duplicate Notifications + Improve Notification Structure

## Root Cause Analysis

Looking at the screenshot: two identical notifications at 12:53, both saying "New message" / "How's your day going?" — one from Samsung Internet (expanded) and one collapsed.

**Why duplicates persist despite the SW fix**: The backend sends FCM messages with a `notification` payload. The browser **automatically** displays this — this happens at the platform level BEFORE our `onBackgroundMessage` handler runs. Our handler correctly skips, but the damage is already done: the browser showed one, and Firebase's SDK internal handling shows another.

The `onBackgroundMessage` skip approach **cannot prevent the browser's automatic display** of `notification`-payload messages. We need to intercept at a lower level.

**Why "New message" instead of sender name**: The backend sets `notification.title = "New message"` generically. The sender's name is likely in the `data` payload but isn't used for the notification title.

## Fix Strategy

**Intercept the raw `push` event** in the service worker BEFORE Firebase processes it. This gives us full control:
- Parse the FCM payload ourselves
- Extract sender name from `data` fields
- Show ONE well-formatted notification with proper `tag` deduplication
- Prevent Firebase SDK from auto-displaying its own

## Changes

### `public/firebase-messaging-sw.js`
- Add a raw `push` event listener (fires before Firebase's internal handler)
- In the push handler: parse the payload, extract `sender_name`/`sender` from data
- Use sender name as notification title instead of generic "New message"
- Set a stable `tag` based on `thread_id` or message content hash to ensure only one notification per message
- Call `event.waitUntil(self.registration.showNotification(...))` with our formatted notification
- Remove the `onBackgroundMessage` handler (no longer needed — we handle everything in `push`)

### `src/lib/pushNotifications.ts`
- Update foreground handler to also extract sender name from data payload
- Use consistent tag format matching the SW

| File | Change |
|------|--------|
| `public/firebase-messaging-sw.js` | Replace `onBackgroundMessage` with raw `push` event interception; format with sender name; tag-based dedup |
| `src/lib/pushNotifications.ts` | Update foreground handler formatting to use sender name from data |

