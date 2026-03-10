

# SW v4: Suppress Firebase Auto-Display + Diagnostic Logging

## Strategy

Re-add `firebase.messaging()` and register an empty `onBackgroundMessage` callback. This tells the Firebase SDK "I'm handling background messages" — suppressing its default auto-display behavior. Our raw `push` listener still fires and shows ONE formatted notification. Detailed logging tracks which handler fires for each payload type.

## Changes

### `public/firebase-messaging-sw.js`
- Bump version comment to `// SW v4`
- Re-add `const messaging = firebase.messaging();`
- Add `messaging.onBackgroundMessage(() => { console.log(...); return; });` — no-op that suppresses Firebase's default display
- Add diagnostic `console.log` statements throughout:
  - `[SW v4] Installing...` / `Activating...` in lifecycle events
  - `[SW v4] Push received. Has notification: X, Has data: Y, Payload: ...` in push handler
  - `[SW v4] Resolved title: ... | body: ...`
  - `[SW v4] Showing notification. Tag: ... | URL: ...`
  - `[SW v4] onBackgroundMessage fired (no-op)` if Firebase's callback triggers
  - `[SW v4] Notification clicked: ...`
- Fix URL fallback logic (use `null` instead of `'/'` in intermediate `||` chain so final `'/'` is the true fallback)
- Keep all existing dedup, sender name extraction, tag, and notificationclick logic

No other files change.

