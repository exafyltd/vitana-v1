

# Fix: Consent race condition — "I Agree" loops back to consent screen

## Root Cause
1. User taps "I Agree" → `grantConsent()` starts an async Supabase write
2. 300ms later → `setAudioOverlayVisible(true)` fires
3. The useEffect (line 85) checks `hasConsent`, which still reads `false` because the async preferences update hasn't resolved
4. Result: consent dialog re-opens in an infinite loop

## Solution
Add a local `consentJustGranted` ref in `VitanaAudioOverlay` that bypasses the async check immediately after consent is given. The consent gate useEffect checks this ref alongside `hasConsent`.

**File:** `src/components/audio/VitanaAudioOverlay.tsx`

1. Add a ref: `const consentJustGrantedRef = useRef(false);`

2. Update the `onConsent` callback to set the ref before re-opening:
```tsx
onConsent={() => {
  grantConsent();
  consentJustGrantedRef.current = true;
  setTimeout(() => setAudioOverlayVisible(true), 300);
}}
```

3. Update the consent gate in the useEffect (line 86-93) to also check the ref:
```tsx
if (!hasConsent && !consentJustGrantedRef.current) {
  setConsentDialogOpen(true);
  setAudioOverlayVisible(false);
  return;
}
// Reset the ref once we pass the gate
consentJustGrantedRef.current = false;
```

Single file change, no other modifications needed.

