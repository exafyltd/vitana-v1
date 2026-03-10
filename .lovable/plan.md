

# Fix: Push Notifications Not Working in Appilix Native App

## Problem

When running inside the Appilix WebView (installed app), push notifications don't arrive because:

1. **Native FCM path**: `requestNativeFcmToken()` posts `{ action: 'get_fcm_token' }` to Appilix and waits 3 seconds for a response. If `google-services.json` isn't configured correctly in the Appilix dashboard, no token comes back — it silently times out and returns `null`.

2. **Web FCM fallback**: `requestFCMToken()` calls `Notification.requestPermission()` and `getToken()` from Firebase Messaging. In Android WebViews, the Web Push API is **not supported** — `Notification` may exist but `getToken()` fails because there's no push subscription endpoint. So this also returns `null`.

3. **Result**: No token is registered with the gateway backend for the app. The backend has no FCM token to send push messages to, so the app never receives notifications. The browser (Samsung Internet) works because it fully supports Web Push.

## Root Cause: Configuration, Not Code

This is primarily a **configuration issue in the Appilix dashboard**, not a code bug. The Appilix native shell needs a valid `google-services.json` file uploaded so it can provide the native FCM token.

## Code Improvements (Resilience)

While the core fix is dashboard configuration, we can make the code more resilient:

### 1. `src/lib/pushNotifications.ts` — Better diagnostics + retry

- **Add detailed logging** during `subscribe()` so you can see in the console exactly which path failed and why
- **Increase native token timeout** from 3s to 5s (Appilix may be slow on first launch)
- **Add a retry mechanism**: if both paths fail, retry once after 2 seconds (the Appilix bridge may not be ready immediately on app start)
- **Store token source** (`native` vs `web`) alongside the token to help debug which path succeeded

### 2. `src/lib/appilix.ts` — Longer timeout + better logging

- Change `requestNativeFcmToken()` timeout from 3000ms to 5000ms
- Add `console.warn` when the timeout fires so it's clear in logs

### 3. `src/App.tsx` — Delayed retry for Appilix

- In the `GlobalHooksInitializer`, if running in Appilix, retry `initializePushNotifications()` after 5 seconds if the first attempt yielded no token (bridge readiness race)

## Required Appilix Dashboard Action

After the code changes, you also need to ensure:
- **`google-services.json`** from the Firebase project `lovable-vitana-vers1` is uploaded in the Appilix dashboard
- The Firebase project has **Cloud Messaging API (V1)** enabled
- The Appilix app package name matches what's registered in Firebase

### Files changed

| File | Change |
|------|--------|
| `src/lib/appilix.ts` | Increase FCM token timeout to 5s, add warning log |
| `src/lib/pushNotifications.ts` | Add diagnostic logging, retry logic, token source tracking |
| `src/App.tsx` | Add delayed retry for Appilix push init |

