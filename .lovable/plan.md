

# Fix: AI Consent Dialog Still Behind ORB

## Problem
The ORB CSS uses `z-index: 40 !important` — the `!important` flag means normal Tailwind utility classes (even `z-[60]`) can lose in specificity. Additionally, the Radix Dialog portal renders at the end of the DOM body, but the `z-50` base class on the content element competes with the Tailwind merge of `z-[60]`.

## Solution
Two changes to guarantee the dialog always renders above the ORB:

### 1. Add `!important` to the dialog's z-index
Since the ORB uses `!important`, the dialog needs it too. Use `z-[60]` with `!important` via Tailwind's `!` prefix on both the overlay and content.

**File:** `src/components/ai/AIDataConsentDialog.tsx` (line 26)

Change:
```tsx
<ResponsiveDialogContent className="max-w-lg z-[60]" overlayClassName="z-[60]">
```
To:
```tsx
<ResponsiveDialogContent className="max-w-lg !z-[60]" overlayClassName="!z-[60]">
```

### 2. Hide the ORB when the consent dialog is open
As a belt-and-suspenders approach, hide the ORB while the consent dialog is visible. In `VitanaAudioOverlay.tsx`, when `consentDialogOpen` is true, dispatch a CSS class or set ORB visibility.

**File:** `src/components/audio/VitanaAudioOverlay.tsx`

When `consentDialogOpen` becomes true, add `data-consent-dialog-open` attribute to `document.body`. Remove it when closed. Then in `src/index.css`, add:

```css
body[data-consent-dialog-open="true"] .vitana-orb {
  z-index: 0 !important;
  pointer-events: none !important;
}
```

This two-pronged approach ensures the dialog is always fully visible and interactive above the ORB.

## Files Changed

| File | Change |
|---|---|
| `src/components/ai/AIDataConsentDialog.tsx` | Add `!` prefix to z-index classes |
| `src/components/audio/VitanaAudioOverlay.tsx` | Toggle body attribute when consent dialog opens/closes |
| `src/index.css` | Suppress ORB z-index when consent dialog is open |

