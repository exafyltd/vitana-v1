

## Fix: Restore Desktop ORB Button

**Problem:** `VitanaOrbButton` in the desktop sidebar footer was stubbed to `return null` during the external widget migration. The visual orb disappeared entirely on desktop.

**Solution:** Restore the orb visual rendering in `VitanaOrbButton` but wire its click handler to open the external widget via `(window as any).VitanaOrb?.open()` instead of the old internal `expandToFull()` flow.

### File: `src/components/vitanaland/VitanaOrbButton.tsx`

Replace the stub with a proper component that:
- Renders the existing `OrbCore` (size `sm`) wrapped in a ghost button with tooltip "Vitana Voice (⌘K)"
- On click, plays the spark chime sound and calls `VitanaOrb.open()`
- Keeps the pulse animation on the `vitanaland-keyboard-trigger` custom event (for Cmd+K)

The visual orb design stays identical to the old `VitanaButton` component — glowing cyan sphere in the sidebar footer. Only the click action changes from internal state to external widget API.

### Files Modified
- `src/components/vitanaland/VitanaOrbButton.tsx` — restore rendering, wire to external widget

