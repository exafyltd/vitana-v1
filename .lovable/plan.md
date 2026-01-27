

# Fix Orb Position on Maxina Mobile Screens

## Problem Identified
The CSS override `.maxina-signin-page .vitana-orb` is not working for two reasons:

1. **IntroExperience.tsx** (`/_intro/maxina`): Missing `maxina-signin-page` class entirely - it only has `maxina-page-content`
2. **CSS Specificity Issue**: Even in MaxinaPortal, `position: fixed` elements are removed from document flow, making descendant selectors unreliable

## Solution
Use a **body-level class** approach instead of relying on descendant selectors for fixed-position elements.

### Implementation

#### 1. Add `maxina-signin-page` class to `<body>` on both pages

Since the orb is `position: fixed` (positioned relative to viewport), we need a class on `<body>` that CSS can use to target the orb directly.

**IntroExperience.tsx** - Add useEffect to toggle body class:
```typescript
// Add on mount, remove on unmount
useEffect(() => {
  document.body.classList.add('maxina-signin-page');
  return () => {
    document.body.classList.remove('maxina-signin-page');
  };
}, []);
```

**MaxinaPortal.tsx** - Add same useEffect:
```typescript
useEffect(() => {
  document.body.classList.add('maxina-signin-page');
  return () => {
    document.body.classList.remove('maxina-signin-page');
  };
}, []);
```

#### 2. Update CSS selector to use body-level class

**src/index.css** - Change the selector to target orbs when body has the class:
```css
/* Maxina portal pages: center orb lower at bottom on mobile */
body.maxina-signin-page .vitana-orb,
body.maxina-signin-page [data-vitana-orb="true"],
body.maxina-signin-page #vitana-orb,
body.maxina-signin-page .OrbFloatingButton {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
}
```

This approach works because:
- The body element is always a parent of all fixed-position elements
- Adding/removing the class on route change keeps styling isolated
- Uses React's cleanup pattern to prevent class leakage

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/IntroExperience.tsx` | Add `useEffect` to toggle `maxina-signin-page` class on `body` |
| `src/pages/portals/MaxinaPortal.tsx` | Add `useEffect` to toggle `maxina-signin-page` class on `body` |
| `src/index.css` | Update selector to `body.maxina-signin-page .vitana-orb` |

## Visual Result

| Route | Mobile Bottom Offset |
|-------|---------------------|
| `/_intro/maxina` | `16px` (lowered) |
| `/maxina` | `16px` (lowered) |
| All other routes | `4px` (unchanged) |

