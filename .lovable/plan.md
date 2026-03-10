

# Fix Duplicate Notifications + Real-time Chat Messages

## Issue 1: Browser Duplicate Notifications — Root Cause Found

The service worker registers our raw `push` handler **AFTER** `firebase.messaging()` is called. The `firebase.messaging()` call internally registers Firebase's own push handler. Push event listeners fire in registration order, so:

1. Firebase's handler fires first → shows notification
2. Our handler fires second → shows another notification
3. `stopImmediatePropagation()` in our handler is too late — Firebase already fired

**Fix**: Remove the `firebase.messaging()` initialization entirely from the service worker. We don't use `onBackgroundMessage` — our raw `push` listener handles everything. Without `firebase.messaging()`, there's no competing handler.

## Issue 2: Real-time Messages in Global Chat — Root Cause

The `chat_messages` table uses default replica identity (primary key only). When using `postgres_changes` with a column filter (`receiver_id=eq.${user.id}`), Supabase Realtime needs the filtered column in the replica identity for reliable server-side filtering. While INSERT events include all columns in the WAL, the filter matching can be unreliable with default replica identity.

**Fix**:
- Set `REPLICA IDENTITY FULL` on `chat_messages` so all columns are available for realtime filtering
- Add a fallback: also subscribe WITHOUT the filter and do client-side filtering, ensuring no messages are missed

## Changes

| File / Resource | Change |
|---|---|
| `public/firebase-messaging-sw.js` | Remove `firebase.messaging()` init — keep only Firebase app init + our raw push handler |
| `src/hooks/useGlobalMessages.ts` | Remove server-side filter from realtime subscription; do client-side filtering instead |
| Database migration | `ALTER TABLE chat_messages REPLICA IDENTITY FULL` |

### `public/firebase-messaging-sw.js`
```
// Keep: importScripts for firebase-app-compat + firebase-messaging-compat
// Keep: firebase.initializeApp(...)
// REMOVE: const messaging = firebase.messaging();
// Keep: self.addEventListener('push', ...) with existing dedup logic
```

### `src/hooks/useGlobalMessages.ts` (realtime subscription ~line 814-858)
- Remove the `filter: receiver_id=eq.${user.id}` from the postgres_changes subscription
- Add client-side check: `if (raw.receiver_id !== user.id) return;`
- This ensures the event always arrives regardless of replica identity issues

### Database
- `ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;` — ensures all columns are in WAL for reliable realtime

