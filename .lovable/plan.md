
# Fix Plan: 401 Membership Error & Maximum Update Depth Loop

## Summary of Issues Found

I discovered **two related but distinct problems**:

1. **401 Unauthorized Error** - The `list_my_memberships` edge function is rejected at the Supabase gateway level because it's missing from `config.toml`
2. **Maximum Update Depth Exceeded** - A React infinite loop caused by unstable dependencies in the `useUserPresence` hook and un-memoized context value in `AuthProvider`

---

## Root Cause Analysis

### Problem 1: 401 Error for list_my_memberships

The edge function `list_my_memberships` is **NOT listed** in `supabase/config.toml`. This means Supabase uses the default `verify_jwt = true`, which causes the gateway to reject requests before your function code ever runs.

Your function already handles authentication internally (the recent fix to use `getUser(token)`), but the gateway blocks it first.

### Problem 2: Maximum Update Depth Loop

The infinite re-render loop is caused by:

1. **Un-memoized `AuthProvider` context value** (line 66-71): Every render creates a new object, causing all `useAuth()` consumers to re-render
2. **Unstable dependency chain in `useUserPresence`** (line 339-341): The effect `[isActive, trackPresence]` triggers when `trackPresence` changes, but `trackPresence` depends on `user?.id` which can change when `AuthProvider` re-renders

---

## Fix Plan

### Fix 1: Add list_my_memberships to config.toml

Add the missing function configuration:

```toml
[functions.list_my_memberships]
verify_jwt = false
```

This allows the function to receive requests, and your internal authentication code handles JWT validation.

### Fix 2: Memoize AuthProvider context value

Update `src/context/AuthProvider.tsx` to prevent unnecessary re-renders:

```typescript
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
// ...

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ... existing state ...

  // Memoize signOut to prevent re-renders
  const signOut = useCallback(async () => {
    // ... existing signOut logic ...
  }, [dismiss]);

  // Memoize context value to prevent re-renders
  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    loading,
    signOut,
  }), [user, session, loading, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Fix 3: Stabilize useUserPresence dependencies

Update `src/hooks/useUserPresence.ts` to break the circular dependency:

```typescript
// Line 339-341: Remove trackPresence from effect dependencies
// Use a ref to call trackPresence without creating a dependency
useEffect(() => {
  trackPresence();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isActive]); // Only trigger on isActive change, not trackPresence
```

Or better yet, use a ref-based approach:

```typescript
const trackPresenceRef = useRef(trackPresence);
useEffect(() => {
  trackPresenceRef.current = trackPresence;
}, [trackPresence]);

useEffect(() => {
  trackPresenceRef.current();
}, [isActive]);
```

---

## Implementation Steps

1. **Update config.toml** - Add `list_my_memberships` with `verify_jwt = false`
2. **Memoize AuthProvider** - Add `useMemo` for context value and `useCallback` for `signOut`
3. **Fix useUserPresence** - Stabilize the effect dependencies to prevent loops
4. **Test** - Verify memberships load correctly and no re-render loops occur

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `[functions.list_my_memberships]` section |
| `src/context/AuthProvider.tsx` | Memoize `value` and `signOut` |
| `src/hooks/useUserPresence.ts` | Fix effect dependency array |

### Impact Assessment

- **Low risk** - Changes are isolated to specific hooks/providers
- **No data changes** - Only React rendering behavior affected
- **Backward compatible** - No API or interface changes

### Verification Steps

After implementation:
1. Log in and navigate to `/home`
2. Check browser console for "Maximum update depth" errors (should be gone)
3. Check Network tab for `list_my_memberships` call (should return 200)
4. Verify memberships data displays correctly
