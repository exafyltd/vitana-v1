

## Fix Share Dialog: Add Scrolling and Visible Close Button

### Problems
1. **Not scrollable**: The dialog content overflows the viewport on mobile with no way to see items below the fold.
2. **No close button visible**: The `DialogContent` base component includes `[&>button]:sr-only` which hides the X close button. The user cannot dismiss the dialog.

### Changes

**File: `src/components/sharing/SocialShareButton.tsx`** (lines 198-319)

1. Add `max-h-[90vh] overflow-y-auto` to `DialogContent` so the dialog scrolls on mobile.
2. Add a visible close button or override the sr-only hiding so users can dismiss the dialog.

Specifically, change line 199:
```
// Before
<DialogContent className="max-w-md">

// After  
<DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto [&>button]:not-sr-only [&>button]:absolute [&>button]:right-4 [&>button]:top-4">
```

This:
- Constrains the dialog to 90% of the dynamic viewport height
- Makes the content scrollable when it overflows
- Overrides the `sr-only` on the close button so it becomes visible and tappable

### What Stays the Same
- All share options (Personal Share, Social Media grid)
- Preview card content
- Share link generation logic
- Platform click handlers

