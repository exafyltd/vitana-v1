
# Fix desktop ORB position — anchor it inside the sidebar footer

## What I found
- The desktop ORB is currently forced globally in `src/index.css`:
  - `left: 1.5rem !important;`
  - `bottom: 1.5rem !important;`
- That hard-codes the ORB to the viewport corner instead of the desktop sidebar.
- The desktop sidebar footer structure in `src/components/AppLayout.tsx` already matches the reference layout:
  1. user profile row
  2. soundscape control
  3. empty space below where the ORB should visually sit
- The reference screenshot shows the ORB centered horizontally in the open desktop sidebar, directly under the Soundscape card, not floating over the main page.

## Implementation plan

### 1. Update desktop ORB CSS in `src/index.css`
Replace the current desktop fixed-position rule so the ORB is positioned relative to the left sidebar footprint instead of the viewport corner:
- keep `position: fixed`
- set `left` to the center of the expanded sidebar (`8rem`, since sidebar width is `16rem`)
- remove the old `left: 1.5rem`
- set a desktop `bottom` value that aligns the ORB into the footer utility zone under Soundscape, matching the screenshot
- keep desktop transform centered with `translateX(-50%)`
- keep high enough z-index so it stays visible above sidebar content

### 2. Preserve the existing mobile rule
Do not change the mobile/tablet rule inside `@media (max-width: 1023px)`.
- mobile already has separate ORB behavior tied to the bottom nav
- this request is specifically for desktop placement

### 3. Handle collapsed desktop sidebar cleanly
Because the sidebar can collapse to icon width, desktop CSS should also include a collapsed-sidebar override so the ORB stays centered within the collapsed rail when needed instead of drifting into content.
This can be done by targeting the desktop sidebar’s collapsed data attribute and switching the desktop `left` value from expanded-center to collapsed-center.

## Expected result
- Desktop, sidebar open: ORB sits centered inside the sidebar footer area under the user profile and Soundscape, exactly like the reference
- Desktop, sidebar collapsed: ORB remains centered in the collapsed rail
- Mobile/tablet: unchanged

## Files to update
- `src/index.css`
- possibly `src/components/AppLayout.tsx` only if a sidebar state hook/class is needed for a precise collapsed override, but I expect CSS-only to be enough

## Technical details
```text
Desktop today:
ORB fixed to viewport bottom-left

Desktop target:
ORB fixed to sidebar center line
┌ sidebar (16rem) ┐
│ profile         │
│ soundscape      │
│      ORB        │
└─────────────────┘
```

Primary change direction:
```css
/* desktop concept */
left: 8rem !important;
transform: translateX(-50%) !important;
bottom: <footer-aligned value> !important;
```

If needed for collapsed desktop:
```css
[data-collapsible="icon"] ... => left: 1.5rem or calc(collapsed width / 2)
```
