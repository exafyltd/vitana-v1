

# Fix: Continue to ORB after granting AI consent

## Problem
When the user taps the ORB without prior consent, the overlay opens, detects no consent, shows the consent dialog, and sets `audioOverlayVisible = false` (line 91). When the user taps "I Agree", `grantConsent` only saves consent and closes the dialog — it never re-opens the audio overlay. So the user is left with everything dismissed.

## Solution
After consent is granted, automatically proceed into the ORB voice session. Replace the `onConsent={grantConsent}` callback with a wrapper that:
1. Calls `grantConsent()` (saves consent, closes dialog)
2. Then calls `setAudioOverlayVisible(true)` to re-open the audio overlay — which will now pass the consent check and connect normally

**File:** `src/components/audio/VitanaAudioOverlay.tsx`

Change the `onConsent` prop from:
```tsx
onConsent={grantConsent}
```
To:
```tsx
onConsent={() => {
  grantConsent();
  // Proceed into voice session now that consent is granted
  setTimeout(() => setAudioOverlayVisible(true), 300);
}}
```

The short delay allows the dialog close animation to complete before the overlay opens. No other files need changes.

