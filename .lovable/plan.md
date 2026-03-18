

# Fix Appilix Device-to-User Identity Mapping

## Problem
Appilix scans for `appilix_push_notification_user_identity` **once at page load** — via URL param, script variable, or cookie. Our Layer 2 (App.tsx `useEffect`) sets the variable and cookie *after* React hydrates, which is too late for Appilix's initial scan.

- **Subsequent visits**: Work fine — Layer 1 (index.html) restores cookie → window variable before React loads
- **First login**: Fails — no cookie exists yet, so Layer 1 finds nothing, and Layer 2 sets it too late

## Fix

**`src/App.tsx`** — In the Layer 2 `useEffect`, after setting the cookie on first login (when `earlyValue` is falsy and we're inside Appilix), trigger a hard reload with the identity as a URL parameter:

```ts
if (user?.id) {
  window.appilix_push_notification_user_identity = user.id;
  document.cookie = `appilix_push_notification_user_identity=...`;

  // First login inside Appilix — no early cookie existed.
  // Reload with URL param so Appilix's native scanner picks it up.
  if (!earlyValue && isAppilix()) {
    const url = new URL(window.location.href);
    url.searchParams.set('appilix_push_notification_user_identity', user.id);
    console.log('[Appilix-Auth] First login — reloading with URL param');
    window.location.replace(url.toString());
    return; // stop further execution
  }
}
```

**`src/App.tsx`** — Re-add the `isAppilix` import from `@/lib/appilix` (it was removed in the previous change).

**`index.html`** — Update the Layer 1 script to also check for the URL parameter (in addition to cookie), and if found, sync it to the cookie for future loads:

```js
// Check URL param first (set by first-login reload)
var params = new URLSearchParams(window.location.search);
var urlIdentity = params.get('appilix_push_notification_user_identity');
if (urlIdentity) {
  window.appilix_push_notification_user_identity = urlIdentity;
  document.cookie = 'appilix_push_notification_user_identity=' + encodeURIComponent(urlIdentity) + '; path=/; max-age=31536000; SameSite=Lax';
  console.log('[Appilix-Early] Identity from URL param:', urlIdentity);
} else {
  // Fall back to cookie
  var m = document.cookie.match(...);
  ...
}
```

## Flow After Fix

1. **First login**: React sets cookie → detects no early value + Appilix shell → reloads with URL param → Appilix scans URL param → device mapped ✓
2. **Subsequent visits**: Layer 1 restores cookie → window variable set before scan → device mapped ✓
3. **Logout**: Cookie cleared → next page load has no identity → clean state ✓

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `isAppilix` import; add first-login reload with URL param |
| `index.html` | Layer 1 script: check URL param before cookie, sync to cookie |

