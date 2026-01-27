

# Move Orb Lower on Maxina Mobile Screens Only

## Problem
The Orb on mobile screens at `/_intro/maxina` and `/maxina` is positioned too high. The user wants it centered at the bottom of the screen on these two specific routes only, while keeping the current position on all other screens.

## Current Architecture
The Orb positioning on mobile is controlled by global CSS in `src/index.css`:

```css
@media (max-width: 768px) {
  .vitana-orb, [data-vitana-orb="true"], ... {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 4px) !important;
  }
}
```

This applies the same `bottom` value to all mobile routes.

## Solution
Add a route-specific CSS class that overrides the `bottom` value only on Maxina routes. This approach:
- Uses the existing `.maxina-signin-page` class pattern already in the codebase
- Keeps desktop unchanged
- Only affects mobile on the two specified routes

## Technical Implementation

### 1. Add Route-Specific CSS Override in `src/index.css`

Inside the existing `@media (max-width: 768px)` block, add a new rule:

```css
/* Maxina portal pages: center orb lower at bottom */
.maxina-signin-page .vitana-orb,
.maxina-signin-page [data-vitana-orb="true"] {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
}
```

This increases the `bottom` value from `4px` to `16px`, pushing the orb lower and more centered at the bottom of the screen.

### 2. Verify Class is Applied on Target Pages

The `maxina-signin-page` class is already applied on:
- `MaxinaPortal.tsx` (the `/maxina` route)
- `IntroExperience.tsx` for the `/_intro/maxina` route

If needed, ensure both pages have this class on their root container.

## Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Add `.maxina-signin-page .vitana-orb` override with lower bottom position |

## Visual Impact

| Route | Before | After |
|-------|--------|-------|
| `/_intro/maxina` (mobile) | `bottom: 4px` | `bottom: 16px` |
| `/maxina` (mobile) | `bottom: 4px` | `bottom: 16px` |
| All other routes (mobile) | `bottom: 4px` | `bottom: 4px` (unchanged) |
| All desktop routes | No change | No change |

## Notes
- The value of `16px` can be adjusted if the user wants it even lower or higher
- Only the vertical position changes; horizontal centering remains intact (`left: 50%`, `transform: translateX(-50%)`)

