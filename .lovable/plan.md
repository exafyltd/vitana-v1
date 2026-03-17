

## Fix: Appilix FCM Token Registration + Notification Dedup

### Problem Summary

User `c7d3260d` has zero rows in `user_device_tokens`. The `subscribe()` method in `pushNotifications.ts` calls `registerAppilixDevice()` which sends device metadata **without** an FCM token. Then `getNativeFcmToken()` returns null (token not yet injected). The code gives up — no polling, no retry. The `appilix:fcm_token` event listener is attached, but if the event never fires or fired before the listener, the token is permanently lost.

### Changes

#### 1. Fix Appilix FCM token polling in `src/lib/pushNotifications.ts`

In the `subscribe()` method, after the initial `getNativeFcmToken()` returns null for Appilix, add a polling loop:

```typescript
// After line 84 (where nativeToken is null for Appilix):
if (isAppilix() && !token) {
  console.log('[Push] Starting Appilix FCM token polling (every 2s, up to 30s)...');
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const polledToken = getNativeFcmToken();
    if (polledToken) {
      token = polledToken;
      console.log(`[Push] ✅ Native Appilix FCM token found after ${attempt * 2}s`);
      break;
    }
    if (attempt % 5 === 0) {
      console.log(`[Push] Still waiting for Appilix FCM token... (${attempt * 2}s elapsed)`);
    }
  }
  if (!token) {
    console.warn('[Push] ❌ Appilix FCM token not available after 30s — native shell may not be injecting it');
  }
}
```

Also update the `registerAppilixDevice()` method to include the FCM token if available, so the gateway gets both metadata AND a usable token in one call. Currently it sends `device_type`, `package_name`, `device_label` but no `fcm_token`.

Remove the early `registerAppilixDevice()` call that sends metadata without a token (line 77). Instead, call registration once AFTER the token is obtained (either immediately or via polling), including the token in the same request.

#### 2. Fix `registerAppilixDevice()` to accept and send the FCM token

Change the method signature to accept an optional token parameter:

```typescript
private async registerAppilixDevice(fcmToken?: string): Promise<void> {
  // ... existing auth logic ...
  body: JSON.stringify({
    fcm_token: fcmToken || undefined,  // Include token when available
    device_type: 'appilix',
    package_name: 'com.vitanaland.app',
    device_label: `Appilix ${navigator.userAgent.slice(0, 80)}`,
  }),
}
```

#### 3. Restructure the Appilix flow in `subscribe()`

New flow:
1. Attach `appilix:fcm_token` listener (keep existing)
2. Try `getNativeFcmToken()` immediately
3. If null, poll every 2s for up to 30s
4. Once token found (or after timeout), call `registerAppilixDevice(token)` — one call with both metadata and FCM token
5. If token found, also call `registerTokenWithBackend(token)` for standard gateway registration
6. If no token after 30s, log clearly that the native shell is not providing the token

#### 4. Fix DB trigger deduplication + notification body

**Migration**: Update the `notify_on_chat_message` trigger to add the sender name (`sender_name`) to the data payload so the gateway can use it for push display. Also add a `message_id` field to data for proper dedup between trigger and gateway:

```sql
-- Updated trigger body field and data payload
INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
VALUES (
  NEW.receiver_id,
  v_tenant_id,
  'new_chat_message',
  v_sender_name,                          -- title = sender name (not generic "New Message")
  v_body_preview,                         -- body = message content only
  jsonb_build_object(
    'entity_id', NEW.id::text,
    'message_id', NEW.id::text,           -- for dedup
    'sender_id', NEW.sender_id::text,
    'sender_name', v_sender_name,         -- for push display
    'url', '/inbox'
  ),
  'push_and_inapp',
  'p1'
);
```

Also change the dedup check to use `message_id` instead of a time window, which is more reliable:

```sql
IF EXISTS (
  SELECT 1 FROM user_notifications
  WHERE user_id = NEW.receiver_id
    AND type = 'new_chat_message'
    AND data->>'message_id' = NEW.id::text
) THEN
  RETURN NEW;
END IF;
```

### Token Source Verification

All three sources currently check:
- `window.appilix_fcm_token` — set by native shell before load, or by early script in `index.html` from URL param
- URL param `?fcm_token=...` — parsed in `index.html` early script and stored to `window.appilix_fcm_token`
- `appilix:fcm_token` event — listener in `attachAppilixTokenListener()`

The polling loop checks `getNativeFcmToken()` which reads `window.appilix_fcm_token` and falls back to URL param. If none of these sources provide a token after 30s, the diagnostic log will clearly state: "Appilix FCM token not available after 30s — native shell may not be injecting it."

### Test Flow

After deployment, the user should:
1. Force-close the Appilix app
2. Re-open the app (triggers fresh WebView load)
3. Wait for login to complete
4. Check browser console (via Appilix debug tools or remote debugging) for `[Push]` log messages
5. Verify a row appears in `user_device_tokens` for user `c7d3260d` with a non-null `fcm_token`
6. Send a test DM from another user
7. Confirm push notification arrives on device

### Files Modified
- `src/lib/pushNotifications.ts` — restructure Appilix token registration with polling retry
- Database migration — update `notify_on_chat_message` trigger for better title/body and message_id-based dedup

