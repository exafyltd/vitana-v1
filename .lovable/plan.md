

# Fix ORB Positioning — Bottom-Left on All Screens

## Problem
There is no universal (all-viewport) base rule for the ORB widget position. On desktop it falls back to the widget's default (bottom-right). The user wants it fixed to **bottom-left** on every page, every screen size.

## Changes

### `src/index.css` — Add universal ORB base rule

Insert **before** the existing mobile `@media (max-width: 768px)` block (before line 570) a new universal rule:

```css
/* ORB — universal fixed position: bottom-left on all screens */
.vitana-orb,
[data-vitana-orb="true"],
#vitana-orb,
.OrbFloatingButton {
  position: fixed !important;
  left: 1.5rem !important;
  bottom: 1.5rem !important;
  right: auto !important;
  top: auto !important;
  transform: none !important;
  z-index: 40 !important;
  margin: 0 !important;
}
```

The existing mobile `@media (max-width: 768px)` block (lines 570–622) stays as-is — it overrides `left: 50%` and `transform: translateX(-50%)` to center the ORB for the Appilix mobile app.

## What is NOT changed
- No components created or deleted (no `OrbTriggerButton` exists)
- No desktop hide/show rules exist to remove
- Mobile override block preserved exactly
- `useOrbVoiceWidget` hook unchanged

## Result
- **Desktop**: ORB visible at bottom-left corner, every page
- **Mobile**: ORB centered horizontally (mobile override wins via specificity)

