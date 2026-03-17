

## Plan: Early Identity Registration + Safe Failure Logging

### 1. Add early identity script in `index.html` (lines 34-53)

Extend the existing inline `<script>` block to also read the `appilix_push_notification_user_identity` cookie and set the window property **before React loads**. Includes diagnostic logging.

```js
// Early Appilix push identity from cookie (before React hydration)
(function() {
  try {
    var m = document.cookie.match(/appilix_push_notification_user_identity=([^;]+)/);
    if (m && m[1]) {
      window.appilix_push_notification_user_identity = m[1];
      console.log('[Appilix-Early] Push identity set from cookie:', m[1]);
    } else {
      console.log('[Appilix-Early] No push identity cookie found');
    }
  } catch(e) {
    console.warn('[Appilix-Early] Push identity cookie read failed:', e);
  }
})();
```

### 2. Keep existing `App.tsx` logic unchanged

The `useEffect` at line 292-297 continues to update both the window property and cookie on login/logout/account changes. No modifications needed.

### 3. Update edge function: safe failure, no broadcast

Modify `supabase/functions/appilix-push/index.ts` to:
- Parse the Appilix JSON response
- If it contains "identity is not found" or `status: "false"`, log a clear diagnostic message and return a structured response indicating the identity isn't registered yet
- No broadcast fallback — fail safely for that user
- Include the `user_identity` value in the diagnostic log so it's easy to correlate

Key change in the response handling:

```ts
const responseText = await response.text();
console.log(`📥 Appilix response: ${response.status} — ${responseText}`);

// Detect identity-not-found and log diagnostic
const identityNotFound = responseText.toLowerCase().includes('identity') &&
                          responseText.toLowerCase().includes('not found');
if (identityNotFound) {
  console.warn(`⚠️ Appilix: user_identity "${user_identity}" is not registered. ` +
    `The user needs to open the app so the early identity script can register their device. ` +
    `No broadcast fallback — failing safely.`);
}

return new Response(
  JSON.stringify({
    success: response.ok && !identityNotFound,
    status: response.status,
    identity_registered: !identityNotFound,
    appilix_response: responseText,
  }),
  { status: response.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

### Files modified

| File | Change |
|------|--------|
| `index.html` | Add cookie-reading script for early identity registration with diagnostics |
| `supabase/functions/appilix-push/index.ts` | Add identity-not-found detection, diagnostic logging, safe failure (no broadcast) |

### What this achieves

- Appilix reads `window.appilix_push_notification_user_identity` at page load, **before** React mounts
- Once a user has logged in once (setting the cookie) and reopens the app, the identity is available immediately for Appilix to register
- If the identity still isn't found, the edge function logs it clearly and fails safely — no private message leakage to other users

