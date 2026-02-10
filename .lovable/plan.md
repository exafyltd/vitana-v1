

# Fix: Snap Carousel Pushed Below Viewport

## Root Cause

The layout chain from page root to carousel:

```text
div (h-[100dvh] flex flex-col)          -- OK, constrains height
  div (flex-1 min-h-0 flex flex-col)    -- OK, fills remaining
    StandardHeader                       -- consumes ~80px
    UtilityActionButton                  -- consumes ~48px
    div (flex-1 min-h-0 flex flex-col)  -- OK
      SplitBar/Tabs (flex-1 flex flex-col) -- OK
        SplitBarList (tab triggers)      -- consumes ~44px
        SplitBarContent                  -- BREAKS: display:block, not flex child
          MobileEventCarousel            -- height: calc(100dvh - 216px) = TOO TALL
```

`SplitBarContent` (Radix `TabsPrimitive.Content`) renders as `display: block` when active. It does NOT participate as a flex child that grows to fill remaining space. So `flex-1` classes on it are ignored.

Then the carousel sets its own height to `calc(100dvh - 216px)` which is the full viewport minus chrome -- but it's already placed 170+ px down the page. The result: most of it overflows below the visible area, and we see only the bottom sliver.

## Fix (2 files)

### 1. `split-bar.tsx` -- Make SplitBarContent a flex participant when active

Add to the base className of `SplitBarContent`:

```
data-[state=active]:flex data-[state=active]:flex-col data-[state=active]:flex-1 data-[state=active]:min-h-0
```

When inactive, Radix sets `display: none`. When active, this overrides to `display: flex` with `flex: 1` so it fills remaining space in the parent flex column. This is backward-compatible -- existing consumers that don't use flex just get a flex container that behaves like block for non-flex children.

### 2. `MobileEventCarousel.tsx` -- Use h-full instead of explicit calc height

Now that the flex chain is unbroken, the carousel can simply fill its parent:

- Root wrapper: change from `style={{ height: calc(100dvh - 216px) }}` to `className="h-full flex flex-col min-h-0"`
- Snap container: `className="flex-1 min-h-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide"`
- Remove the `CHROME_HEIGHT_PX` constant from the root wrapper (keep it only for individual card `minHeight`)
- Remove the red debug border
- Keep the debug banner (fixed position) for one more verification cycle

### 3. Verify `EventsAndMeetups.tsx` -- Ensure SplitBar itself is flex

The `SplitBar` (Tabs root) at line 714 already has `className="flex-1 min-h-0 flex flex-col"` on mobile. This is correct and needs no change.

## Technical Details

| File | Change |
|------|--------|
| `src/components/ui/split-bar.tsx` | Add `data-[state=active]:flex data-[state=active]:flex-col data-[state=active]:flex-1 data-[state=active]:min-h-0` to SplitBarContent base className |
| `src/components/community/MobileEventCarousel.tsx` | Root wrapper: `h-full flex flex-col min-h-0` (remove explicit calc height). Snap container: `flex-1 min-h-0`. Remove red debug border. Keep debug banner. |

## Why This Will Work

With the SplitBarContent fix, the entire chain from `h-[100dvh]` page root to the carousel is an unbroken sequence of `flex flex-col` containers with `flex-1 min-h-0`. Each level takes remaining space after its siblings (headers, tab bar) consume their natural height. The carousel ends up with exactly the right amount of space -- no explicit pixel math needed.

