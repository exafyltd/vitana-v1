

# Fix Orb Position: Move Lower on Maxina Mobile Screens

## Problem Identified

There are **two issues** preventing the fix from working:

### Issue 1: Changes Not Published
The user is testing on **vitanaland.com** (published site), but frontend changes require clicking **Publish → Update** to go live. The code changes from the last edit are only visible in the preview, not on the published site yet.

### Issue 2: CSS Logic is Inverted
The current CSS override **increases** the `bottom` value from `4px` to `16px`, which actually moves the orb **higher** (more gap from the bottom edge), not lower. The user wants the orb **closer** to the bottom edge.

**Current CSS (wrong direction):**
```css
/* General mobile: close to bottom */
bottom: calc(env(safe-area-inset-bottom, 0px) + 4px) !important;

/* Maxina override: further FROM bottom (wrong!) */
bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
```

## Solution

Since the user wants the orb "lower" (closer to the bottom edge) on Maxina pages, we need to **remove** the extra offset entirely and rely only on the safe-area-inset for these pages.

### Updated CSS

```css
/* Maxina portal pages: dock orb at bottom edge on mobile */
body.maxina-signin-page .vitana-orb,
body.maxina-signin-page [data-vitana-orb="true"],
body.maxina-signin-page #vitana-orb,
body.maxina-signin-page .OrbFloatingButton {
  bottom: env(safe-area-inset-bottom, 0px) !important;
}
```

This positions the orb flush with the safe area (no additional gap), making it sit as low as possible while respecting device safe areas (like iPhone home indicator).

## Deployment Steps

After implementing the fix:
1. **Preview** - The change will be visible immediately in the Lovable preview
2. **Publish** - Click **Publish → Update** to deploy to vitanaland.com
3. **Clear cache** - User may need to hard-refresh (pull down in mobile Safari/Chrome) to see changes

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Change Maxina override from `+ 16px` to `0px` (safe-area only) |

## Visual Result

| Route | Mobile Bottom Offset |
|-------|---------------------|
| `/_intro/maxina` | `0px` (flush with safe area - lowest possible) |
| `/maxina` | `0px` (flush with safe area - lowest possible) |
| All other routes | `4px` (small gap, unchanged) |

