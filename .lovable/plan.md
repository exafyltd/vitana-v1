

## Fit Event Details to Available Viewport (Below Appilix Header)

### Problem Analysis

Looking at the screenshot, the event details sheet uses `h-[100dvh]` (full device viewport height), but the app runs inside Appilix which has its own header bar (~1.3cm / 52px). This causes:

1. **Content extends beyond visible area**: The sheet thinks it has the full screen, but the Appilix header occupies the top
2. **White gap visible**: The `pt-5` padding we added creates a white band, but doesn't solve the core sizing issue
3. **CTA bar pushed too low**: The action bar at the bottom may be cut off or positioned incorrectly

### Solution

Instead of using `h-[100dvh]` (full viewport), we need to account for the Appilix header by:

1. **Use CSS calc to subtract header height**: Change the mobile Sheet height from `h-[100dvh]` to `h-[calc(100dvh-52px)]` (where 52px ≈ 1.3cm for the Appilix bar)
2. **Remove the pt-5 padding**: Since we're now sizing correctly, we don't need the top padding hack
3. **Adjust top position**: Position the sheet at `top-[52px]` instead of relying on bottom positioning

### Files to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Adjust mobile Sheet height and positioning to account for Appilix header |

### Implementation Details

#### MeetupDetailsDrawer.tsx (around line 1407-1412)

```tsx
// BEFORE
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="bottom" className="h-[100dvh] p-0 rounded-none">
    {content}
  </SheetContent>
</Sheet>

// AFTER
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent 
    side="bottom" 
    className="h-[calc(100dvh-52px)] p-0 rounded-none"
  >
    {content}
  </SheetContent>
</Sheet>
```

The `52px` value accounts for:
- Appilix header bar: ~1.3cm ≈ 52px
- This leaves the full remaining viewport for the event details

#### Remove the pt-5 padding from hero (line 610-612)

```tsx
// BEFORE
<div className={cn(
  "relative w-full aspect-video bg-muted overflow-hidden",
  isMobile && "pt-5"
)}>

// AFTER
<div className="relative w-full aspect-video bg-muted overflow-hidden">
```

Since we're now correctly sizing the container, the padding is no longer needed.

### Why This Works

```text
BEFORE:                          AFTER:
+------------------------+       +------------------------+
| MAXINA (52px header)   |       | MAXINA (52px header)   |
+------------------------+       +------------------------+
|                        |       |  Hero Image            |
|  Sheet at h-[100dvh]   |       |    (Event Title)       |
|  extends under header  |       +------------------------+
|                        |       |  Content               |
|  Content...            |       |  (tags, when/where)    |
|                        |       +------------------------+
|                        |       |  [CTA Bar]             |
+------------------------+       +------------------------+
| CTA bar pushed down    |       | Fits perfectly         |
| or off-screen          |       | in available space     |
+------------------------+       +------------------------+
```

### Visual Result

After this change:
- Event details will perfectly fill the space below the Appilix header
- Hero image starts immediately at the top of the sheet (no white gap)
- CTA bar sits properly at the bottom
- X close button remains visible and unobstructed
- Mute button stays behind the sheet (already fixed)

### Note on Header Height

If the Appilix header height changes or varies by device, you could use a CSS custom property:

```css
:root {
  --appilix-header-height: 52px;
}
```

And reference it: `h-[calc(100dvh-var(--appilix-header-height))]`

For now, we'll use the fixed `52px` value based on your ~1.3cm measurement.

