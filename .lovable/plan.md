

# Fix ORB Widget — Missing on Landing Pages + Wrong Position

## Changes

### 1. `src/App.tsx` — Move ORB init to app root
Call `useOrbVoiceWidget()` inside the top-level component (after `AuthProvider`) so the widget initializes on every page, including MaxinaPortal, IntroExperience, and Auth.

### 2. `src/components/AppLayout.tsx` — Remove duplicate hook call
Remove `useOrbVoiceWidget()` call (line 398) and its import to avoid double-initialization.

### 3. `src/index.css` — Broaden CSS selectors
Add `#vitana-orb-fab` and `[id^="vitana-orb"]` to the existing universal bottom-left rule:

```css
.vitana-orb,
[data-vitana-orb="true"],
#vitana-orb,
.OrbFloatingButton,
#vitana-orb-fab,
[id^="vitana-orb"] {
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

Existing mobile `@media (max-width: 768px)` block stays as-is.

### No MutationObserver
Skipped per your direction. CSS `!important` rules should suffice. If the widget's inline styles still win, we revisit with a targeted JS fix later.

## Files changed

| File | Change |
|------|--------|
| `src/App.tsx` | Add `useOrbVoiceWidget()` call at app root |
| `src/components/AppLayout.tsx` | Remove `useOrbVoiceWidget()` call and import |
| `src/index.css` | Broaden selectors on universal ORB rule |

