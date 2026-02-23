

## Fix: Search Dropdown Not Visible

### Root Cause

The `ExpandableSearchButton` renders its dropdown with `position: absolute` inside a container that has `overflow-x-auto` (line 36 of `utility-action-button.tsx`). This CSS property clips any content that overflows vertically too, so the dropdown is rendered but hidden.

### Solution

Use a React Portal to render the dropdown outside of the clipped container, positioning it relative to the search input using `getBoundingClientRect()`.

### Changes

**File: `src/components/ui/expandable-search-button.tsx`**

1. Import `createPortal` from `react-dom`
2. Track the input wrapper's position using a ref and compute dropdown coordinates with `getBoundingClientRect()`
3. Render the dropdown via `createPortal(...)` into `document.body` using `position: fixed` with `top` and `left` calculated from the input's bounding rect
4. Recalculate position on scroll/resize using a layout effect or by computing on each render when `showDropdown` is true
5. The dropdown width matches the input width (from `getBoundingClientRect().width`)

The outside-click handler and `onMouseDown` approach remain unchanged. The only visual difference is the dropdown now escapes the scrollable utility bar and appears correctly below the search input.

### Technical Details

```text
Before (clipped):
  UtilityActionButton [overflow-x-auto]
    ExpandableSearchButton
      Input
      Dropdown [absolute] -- CLIPPED by parent overflow

After (portal):
  UtilityActionButton [overflow-x-auto]
    ExpandableSearchButton
      Input
  document.body
    Dropdown [fixed, positioned via getBoundingClientRect] -- VISIBLE
```

Key implementation points:
- Use `useEffect` to update position when `showDropdown` changes
- Store position in state: `{ top, left, width }`
- The portal div gets the same styling (z-50, bg-popover, border, rounded-lg, shadow-lg, max-h-64, overflow-y-auto)
- Close on scroll of the parent container to avoid stale positioning (optional, escape already handles this)
