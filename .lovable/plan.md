

# Fix ORB Mobile Positioning — Above Bottom Nav

## Problem
On mobile, the ORB sits at `bottom: calc(env(safe-area-inset-bottom) + 4px)` which places it **behind** the bottom navigation bar. The screenshots show it should float **above** the bottom nav on authenticated pages, and near the bottom edge on landing pages (where there is no bottom nav).

## Changes — `src/index.css` only

### 1. Mobile general rule (line 603)
Change the bottom value for the main mobile ORB rule to position it above the bottom nav bar:
```css
bottom: calc(var(--appilix-bottom-nav-height, 72px) + env(safe-area-inset-bottom, 0px) + 12px) !important;
```

### 2. Landing/portal pages override (line 640)
On Maxina landing and sign-in pages there is **no bottom nav**, so the ORB should sit closer to the bottom edge. Update the `body.maxina-signin-page` override:
```css
bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
```

### 3. Desktop rule stays as-is
The `left: 1.5rem` desktop position (line 580) is a separate concern from this mobile fix. No desktop changes in this plan.

## Result
- Authenticated mobile pages: ORB centered horizontally, floating ~12px above the bottom nav
- Landing/sign-in pages: ORB centered horizontally, near the bottom edge (no nav bar to clear)
- Matches all three reference screenshots

