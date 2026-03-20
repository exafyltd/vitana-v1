

## Fix: Appilix Mobile Push Notifications Not Delivering

### Root Cause (Two Issues)

**Issue 1: Wrong identity registration format**

The Appilix docs (uploaded) specify this exact format for registering user identity:

```javascript
appilix.postMessage(JSON.stringify({
  type: "firebase_record_user_identity",
  props: { user_identity: "user@email.com" }
}));
```

But our code in `registerAppilixIdentity()` sends:

```javascript
// Current (WRONG)
{ action: "update_settings", settings: { user_identity: userId } }
```

This means the native shell never maps the user UUID to the device. The Appilix API returns "identity not found" because the device was never registered with the correct message type.

**Issue 2: Edge function not deployed / trigger not active**

The `appilix-push` edge function has **zero logs** — meaning either the trigger isn't firing in the live database, or the function was never deployed. The migration file exists but may not have been applied to the external Supabase project.

### Fix

**1. `src/lib/appilix.ts`** — Fix identity registration to use the documented format

Replace the `registerAppilixIdentity` function to use the correct Appilix message type:

```typescript
export function registerAppilixIdentity(userId: string): boolean {
  if (!isAppilix()) {
    console.debug('[Appilix] Not in Appilix shell, skipping identity registration');
    return false;
  }
  console.log(`[Appilix] Registering user_identity: ${userId}`);
  try {
    window.appilix!.postMessage(JSON.stringify({
      type: "firebase_record_user_identity",
      props: { user_identity: userId }
    }));
    return true;
  } catch (e) {
    console.warn('[Appilix] Identity registration failed:', e);
    return false;
  }
}
```

**2. `index.html`** — Add early identity registration using the correct format

The early script already reads the identity cookie. Add a line to register it immediately (before React hydrates) using the documented format:

```javascript
if (m && m[1] && window.appilix?.postMessage) {
  window.appilix.postMessage(JSON.stringify({
    type: "firebase_record_user_identity",
    props: { user_identity: m[1] }
  }));
  console.log('[Appilix-Early] Identity registered with native shell:', m[1]);
}
```

**3. Deploy the `appilix-push` edge function** to the external Supabase project (if not already deployed).

**4. Verify the `trg_appilix_push` trigger** exists in the live database by checking the migration was applied.

### Why notifications were intermittent

Sometimes the `updateSettings` format happened to work (possibly an older Appilix build accepted it), but it's not the documented API. The correct `firebase_record_user_identity` type is what reliably maps device → user identity in Appilix's push system.

### Files to modify
- `src/lib/appilix.ts` — fix `registerAppilixIdentity` to use correct message format
- `index.html` — add early identity registration with correct format
- Deploy `appilix-push` edge function (manual CLI step or via Lovable deploy tool)

