

# Push Orb Even Lower on Maxina Mobile Screens

## Current State
Looking at the screenshot, the Orb is positioned above the footer links ("Privacy · Terms · Help"). The user wants it **much lower** - essentially at the very bottom of the viewport, just above the Android system navigation bar.

## Problem
The current CSS sets `bottom: env(safe-area-inset-bottom, 0px)`, which equals `0px` on most Android devices. This still places the Orb above the absolute bottom because of:
1. The Orb's own height/size
2. Any transform offsets applied to center it

## Solution
Use a **negative bottom value** to push the Orb below its default position, getting it as close to the system navigation bar as possible.

## Technical Implementation

**File: `src/index.css`**

Change the Maxina-specific orb positioning from:
```css
bottom: env(safe-area-inset-bottom, 0px) !important;
```

To:
```css
bottom: calc(env(safe-area-inset-bottom, 0px) - 24px) !important;
```

The `-24px` offset will push the Orb 24 pixels lower than the current position, bringing it much closer to the bottom edge of the screen.

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Change Maxina orb `bottom` from `0px` to `-24px` offset |

## Visual Result

| Route | Mobile Bottom Offset |
|-------|---------------------|
| `/_intro/maxina` | `-24px` (very close to bottom edge) |
| `/maxina` | `-24px` (very close to bottom edge) |
| All other routes | `+4px` (unchanged) |

## Post-Implementation
After approval and implementation, remember to click **Publish → Update** to deploy changes to vitanaland.com.

