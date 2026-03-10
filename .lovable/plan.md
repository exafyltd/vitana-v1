

# Fix: Push Notifications in Appilix App

## The Real Problem

Looking at the Appilix dashboard screenshot — Firebase is correctly configured (google-services.json uploaded, permission granted, package `com.vitanaland.app`). **But Appilix doesn't expose a JavaScript bridge to retrieve the native FCM token.** 

Appilix's push notification system is designed for sending notifications **from the Appilix control panel** to all users. It does not respond to our custom `{ action: 'get_fcm_token' }` postMessage — we invented that action, and Appilix ignores it. So `requestNativeFcmToken()` always times out → `null`. The web FCM fallback also fails because Android WebViews don't support the Web Push API.

**Result**: No token is ever registered with our backend, so our backend can never send push notifications to the app.

## Solution: Inject FCM Token via Appilix Custom JS

Appilix has a **"Custom CSS & JS"** section in the dashboard (visible in the left sidebar of the screenshot). We can inject JavaScript there that reads the native FCM token and exposes it to our web app via `window.appilix_fcm_token`.

### Two-part fix:

### Part 1 — Code changes (make token detection more robust)

**`index.html`**: Add an early `<script>` that listens for the FCM token from multiple possible injection methods:
- Check URL parameters (`?fcm_token=...`) — some WebView wrappers append the token to the URL
- Listen for `document` custom events (`appilix:fcm_token`)  
- Poll `window.appilix_fcm_token` every 500ms for 10s (in case Custom JS injects it asynchronously)

**`src/lib/appilix.ts`**: Update `requestNativeFcmToken()` to:
- Check URL params for the token
- Extend polling to 10s (Custom JS may run after our React bundle)
- Listen on `document` for a custom event as well as `window` message events

**`src/lib/pushNotifications.ts`**: In the Appilix path, add a longer retry chain — retry at 5s, 10s, and 15s since the Custom JS injection timing is unpredictable.

### Part 2 — Appilix Dashboard action (manual step for you)

In the Appilix Dashboard → **Custom CSS & JS**, add this JavaScript snippet:

```javascript
// Inject native FCM token for VITANA backend
if (typeof firebase !== 'undefined' && firebase.messaging) {
  firebase.messaging().getToken().then(function(token) {
    window.appilix_fcm_token = token;
    document.dispatchEvent(new CustomEvent('appilix:fcm_token', { detail: token }));
  });
}
```

If Appilix doesn't expose `firebase.messaging()` to Custom JS (likely), the alternative is to use Appilix's own notification infrastructure — we would send notifications through Appilix's API instead of direct FCM. In that case, we don't need the token at all; we'd use Appilix's push API from our backend.

**However**, the most practical immediate solution: configure our **Firebase Cloud Messaging** to send to the **topic** that Appilix subscribes all app installs to. Appilix likely subscribes all devices to a default FCM topic (often the package name). We can send targeted notifications by using FCM topic messaging or by using Appilix's notification API endpoint.

### Files changed

| File | Change |
|------|--------|
| `index.html` | Add early script to detect FCM token from URL params and custom events |
| `src/lib/appilix.ts` | Broaden token detection: URL params, custom events, longer polling |
| `src/lib/pushNotifications.ts` | Add extended retry chain for Appilix (5s, 10s, 15s) |

### Manual step required

After code deployment, add the FCM token injection script in **Appilix Dashboard → Custom CSS & JS**, then rebuild the APK.

