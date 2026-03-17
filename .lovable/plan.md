

## Summary: What Was Changed to Restore Bell Notifications

### Changes already made (code side — complete)

1. **`src/lib/pushNotifications.ts` — `initialize()`**: Removed the `isAppilix()` early return that was skipping service worker registration. The Firebase messaging service worker (`firebase-messaging-sw.js`) now registers normally inside the Appilix WebView.

2. **`src/lib/pushNotifications.ts` — `subscribe()`**: Removed the 30-second polling loop that waited for a native Appilix FCM token (which never arrives). Replaced with a single instant check — if no native token, it immediately proceeds to standard Web FCM registration.

3. **`src/lib/appilixNotificationFallback.ts`**: Removed the `isAppilix()` gate so the browser Notification fallback works on all platforms.

These changes restore the exact flow that worked on March 12:
```text
App loads → SW registers → Web FCM token obtained → Token sent to gateway
→ New chat message → DB trigger → Gateway sends FCM → SW receives push → showNotification()
```

---

### What you need to do on your side

1. **Clear the Appilix app cache/data** — The old service worker (which was never registered due to the skip) may be cached. Go to Android Settings → Apps → Vitana/Appilix → Storage → Clear Cache (and optionally Clear Data). This forces a fresh service worker registration.

2. **Open the app and log in** — After clearing cache, open the app normally and sign in.

3. **Grant notification permission** — When prompted, tap "Allow" for notifications. If no prompt appears, check Android Settings → Apps → Vitana → Notifications and ensure they're enabled.

4. **Check the console** — If you have access to remote debugging (chrome://inspect), look for these log lines in order:
   - `[Push] Service Worker registered`
   - `[Push] Trying web FCM...`
   - `[Push] ✅ Web FCM token obtained`
   - `[Push] ✅ Token registered with backend`

   If you see `[Push] ⚠️ Web FCM returned null`, it means the WebView denied notification permission silently.

5. **Test** — Background the app, send a DM from another account, and the bell notification should appear within a few seconds.

### If notifications still don't appear after these steps

The most likely causes would be:
- **Permission not granted**: Android WebView may need explicit notification channel permission
- **Gateway not receiving the token**: The `POST /notifications/token` call may be failing — console logs will show this
- **Service worker not activating**: The `firebase-messaging-sw.js` may need a hard refresh (close app completely, reopen)

No further code changes are needed — the push path is fully restored. This is an on-device verification step.

