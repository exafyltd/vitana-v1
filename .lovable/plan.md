

## Fix: "Sign in required" shown after successful account deletion

### Root Cause

After the edge function deletes the auth user, `signOut()` fires and sets `user = null`. The component re-renders and the early-return guard on line 66 (`if (!authLoading && !user)`) triggers **before** `setStep("done")` can take effect, showing "Sign in required" instead of the success screen.

### Fix

**File: `src/pages/legal/DeleteAccount.tsx`**

Move the `!user` early-return check so it does NOT apply when `step` is `"deleting"` or `"done"`:

```typescript
if (!authLoading && !user && step === "info") {
```

This ensures:
- Unauthenticated users landing on the page still see "Sign in required"
- Users mid-deletion or post-deletion see the correct deleting/done screens even after `user` becomes null

One-line change.

### Files to modify
- `src/pages/legal/DeleteAccount.tsx` — line 66 condition

