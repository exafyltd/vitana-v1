

## Fix Mobile Event Details Viewport Positioning

### Problem Analysis

Looking at the screenshot, I can see these UX issues:

| Issue | Root Cause |
|-------|------------|
| **Gray band at top** | Sheet uses `side="bottom"` which positions it at `bottom-0`. With `h-[calc(100dvh-52px)]`, the sheet doesn't reach the top, leaving a 52px gap showing the gray overlay. |
| **Content not aligned** | The sheet slides up from bottom but stops short of the Appilix header, creating dead space |

The current approach:
```text
+------------------------+  <- top of viewport
| MAXINA (52px)          |
+------------------------+
| 52px GAP (gray area)   |  <- This is the overlay showing through!
+------------------------+
| Sheet starts here      |  <- Sheet is bottom-anchored, height stops short
| (hero image)           |
+------------------------+
```

What we need:
```text
+------------------------+  <- top of viewport  
| MAXINA (52px)          |  <- Appilix header (outside our control)
+------------------------+
| Sheet starts here      |  <- Sheet TOP-anchored at 52px
| (hero image fills)     |
|                        |
| [CTA Bar]              |
+------------------------+  <- bottom of viewport
```

---

### Solution

Override the sheet positioning for this specific mobile use case:
1. Change from `bottom-0` to `top-[52px]` positioning
2. Remove `bottom-0` default and set explicit `bottom-0` so it stretches full height
3. Hide the default Sheet close button (we have our own X in the hero)

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Override Sheet positioning to anchor from top-[52px] instead of bottom-0 |

---

### Implementation Details

#### MeetupDetailsDrawer.tsx (line ~1406)

```tsx
// BEFORE
<SheetContent side="bottom" className="h-[calc(100dvh-52px)] p-0 rounded-none">

// AFTER
<SheetContent 
  side="bottom" 
  className="!top-[52px] !bottom-0 !h-auto p-0 rounded-none [&>button]:hidden"
>
```

**Explanation of the changes:**
- `!top-[52px]` - Positions sheet 52px from top (below Appilix header) with `!important` to override the default `bottom` variant
- `!bottom-0` - Anchors to bottom of viewport
- `!h-auto` - Let height be determined by top/bottom anchoring instead of explicit height
- `[&>button]:hidden` - Hides the default Sheet close button (we have our own X)

This makes the sheet stretch from `top: 52px` to `bottom: 0`, perfectly filling the available space below the Appilix header.

---

### Visual Result

After this fix:
- Hero image starts immediately below the MAXINA header bar (no gray gap)
- Content fills the entire available viewport
- CTA bar sits at the proper bottom position
- X close button remains visible in hero (our custom one)
- No duplicate close buttons

---

### Alternative Approach (if needed)

If the `!important` overrides don't work cleanly, we could create a custom sheet variant or use inline styles:

```tsx
<SheetContent 
  side="bottom" 
  className="p-0 rounded-none [&>button]:hidden"
  style={{ 
    top: '52px', 
    bottom: 0, 
    height: 'auto',
    insetInline: 0 
  }}
>
```

This gives us explicit control over positioning without fighting the CSS cascade.

