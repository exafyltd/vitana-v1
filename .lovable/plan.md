

## Fix Mobile Event Details to Fill Entire Available Viewport

### Root Cause Analysis

The gray gap persists because:

1. **Appilix header is OUTSIDE the web page** - The web viewport already starts below the blue "MAXINA" bar
2. **Current code uses `!top-[52px]`** - This offsets from the web viewport top, which is already under the header, creating a double offset
3. **SheetOverlay shows in the gap** - The semi-transparent overlay fills `inset-0` while content starts at `52px`, showing a gray band

```text
CURRENT PROBLEM:
+------------------------+  <- Physical screen top
| MAXINA (native bar)    |  <- Not in our web viewport
+========================+  <- Web viewport starts here
| SheetOverlay (z-50)    |  <- Gray/blur visible
+------------------------+
| !top-[52px] content    |  <- Content offset AGAIN
|                        |
+------------------------+
```

### Solution

Since Appilix header is **outside** the web page, the web viewport already fills the remaining space. We need:

1. **Remove the `!top-[52px]` offset** - Use `inset-0` to fill the entire web viewport
2. **Hide the overlay** - No overlay needed since content fills the full viewport
3. **Ensure proper height** - Use `!h-full` to stretch content

```text
AFTER FIX:
+------------------------+  <- Physical screen top
| MAXINA (native bar)    |  <- Not in our web viewport
+========================+  <- Web viewport starts here
| Hero Image (flush)     |  <- Content fills from top
| Event Details          |
| [CTA Bar]              |
+========================+  <- Web viewport ends here
| Device navigation      |
+------------------------+
```

---

### File to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Update SheetContent classes to fill entire viewport with no overlay gap |

---

### Implementation Details

#### MeetupDetailsDrawer.tsx (line ~1406-1408)

```tsx
// BEFORE
<SheetContent 
  side="bottom" 
  className="!top-[52px] !bottom-0 !h-auto p-0 rounded-none [&>button]:hidden"
>

// AFTER
<SheetContent 
  side="bottom" 
  className="!inset-0 !h-full p-0 rounded-none [&>button]:hidden"
>
```

**What each class does:**
- `!inset-0` - Overrides `bottom-0` variant to position at `top: 0, right: 0, bottom: 0, left: 0` (fills entire web viewport)
- `!h-full` - Explicit full height to ensure content stretches
- `p-0` - No padding on the sheet container
- `rounded-none` - No rounded corners for full-screen feel
- `[&>button]:hidden` - Hide default close button (we have custom X)

---

### Why This Works

Since the Appilix header is **native** (outside the web content):

1. The web viewport is already the space below the header
2. Using `!inset-0` fills the entire web viewport
3. No additional offset needed - the hero image will be flush to the top of the web viewport (which is visually below the native header)
4. The SheetOverlay becomes irrelevant since content covers the entire viewport

---

### Visual Result

After this fix:
- Hero image fills from the very top of the web viewport (visually right below MAXINA header)
- No gray overlay gap visible
- Content fills the entire available mobile screen
- CTA bar positioned at the bottom
- Clean, immersive full-screen event details experience

