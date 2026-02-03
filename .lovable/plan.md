
## Fix Sign-In Screen Flash for Already Authenticated Users

### Problem
When you're already logged in and return to the app, the Maxina sign-in screen briefly flashes for 1-2 seconds before automatically redirecting you inside. This is confusing because it looks like you need to enter credentials again.

### Root Cause
The portal pages currently only show a loading spinner while checking authentication status (`authLoading`). Once that check completes and a user is found, the redirect starts - but it's async (verifies session, prefetches data, switches tenant). During that async work, the sign-in form is rendered and visible.

### Solution
Add an early return that shows a loading state when `user` exists, so the sign-in form never renders for authenticated users. The redirect logic continues working in the background.

---

### Changes

**File: `src/pages/portals/MaxinaPortal.tsx`**

Add a check after the existing `authLoading` check (around line 258):

```tsx
if (authLoading) {
  return (
    // ... existing loading spinner with video background
  );
}

// NEW: Also show loading state if user exists (redirect in progress)
if (user) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {videoSrc && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover"
          src={videoSrc}
        />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/25 via-black/5 to-transparent z-10" />
      <div className="relative z-20 min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    </div>
  );
}

return (
  // ... sign-in form (only shows for unauthenticated users)
);
```

This way:
- `authLoading = true` → Show spinner (checking if user exists)
- `user = truthy` → Show spinner (user exists, redirect in progress)
- `user = null` → Show sign-in form (user needs to authenticate)

---

### Affected Portals
The same fix should be applied to all tenant portals for consistency:
- `MaxinaPortal.tsx` (primary)
- `AlkalmaPortal.tsx`
- `EarthlinksPortal.tsx`
- `ExafyAdminPortal.tsx`

---

### Expected Outcome
When you're already logged in and open the app:
1. Splash screen appears
2. Loading spinner on video background (same as auth check)
3. Directly into the app - **no sign-in form flash**
