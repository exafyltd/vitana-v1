

# Fix: AI Consent Dialog renders behind the ORB on mobile

## Problem
The ORB uses `z-index: 40 !important` via CSS, but on mobile the consent dialog's bottom sheet appears behind it because the ORB's fixed positioning and `!important` rule wins the stacking contest.

## Solution
Pass higher z-index classes to the `AIDataConsentDialog`'s `ResponsiveDialogContent` — use `z-[60]` for both the overlay and content, matching the existing pattern used by other secondary dialogs (UniversalShareDialog, etc.) that need to stack above the ORB.

## Change

**File:** `src/components/ai/AIDataConsentDialog.tsx`

Add `overlayClassName="z-[60]"` and `className="max-w-lg z-[60]"` to `ResponsiveDialogContent`:

```tsx
<ResponsiveDialogContent className="max-w-lg z-[60]" overlayClassName="z-[60]">
```

This single-line change ensures the consent dialog and its backdrop render above the ORB (z-40) on mobile.

