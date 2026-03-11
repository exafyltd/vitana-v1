

# Fix: ORB voice broken by consent gate race condition

## Root Cause

The consent gate useEffect (line 86-106) depends only on `[audioOverlayVisible]` but reads `hasConsent`, which is loaded asynchronously via React Query (`useUserPreferences`). The sequence:

1. User taps ORB → `audioOverlayVisible = true`
2. useEffect fires immediately
3. `hasConsent` is still `false` because the preferences query hasn't resolved yet (`isLoading = true`)
4. Gate triggers: shows consent dialog, sets `audioOverlayVisible(false)` → ORB never connects
5. This happens every time, even for users who already consented

The `consentJustGrantedRef` only helps for the flow where consent is granted in that same session — it doesn't help when preferences are still loading.

## Fix

**File: `src/components/audio/VitanaAudioOverlay.tsx`**

Two changes:

1. **Destructure `isLoading`** from `useAIConsent()` (line 43)
2. **Skip the consent gate while preferences are loading** (line 89) — if `isLoading` is true, do nothing and wait for the query to resolve
3. **Add `hasConsent` and `isLoading` to the useEffect dependency array** so it re-runs when preferences finish loading

```tsx
// Line 43: add isLoading
const { hasConsent, isLoading: consentLoading, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();

// Line 86-106: updated useEffect
useEffect(() => {
  if (audioOverlayVisible) {
    // Wait for preferences to load before checking consent
    if (consentLoading) return;

    // Gate on AI consent
    if (!hasConsent && !consentJustGrantedRef.current) {
      console.log('[VitanaAudioOverlay] No AI consent — showing consent dialog');
      setConsentDialogOpen(true);
      setAudioOverlayVisible(false);
      return;
    }
    consentJustGrantedRef.current = false;
    console.log('[VitanaAudioOverlay] Overlay opened - connecting...');
    setMicMuted(false);
    pausePersisting();
    connect();
  } else {
    console.log('[VitanaAudioOverlay] Overlay closed - disconnecting...');
    resumePersisting();
    disconnect();
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [audioOverlayVisible, hasConsent, consentLoading]);
```

This ensures:
- While preferences load → effect does nothing (no false-negative consent check)
- Once loaded, if consent exists → proceeds to `connect()` immediately
- Once loaded, if no consent → shows dialog correctly
- After granting consent → ref bypass still works as before

Single file change. No other modifications needed.

