

# Align Event Card Edges with Title/Subtitle

## Problem
The event card has an extra internal padding (`6px 8px`) inside its wrapper div, creating a visible "frame" or gap around the card. The page already has `px-2` (8px) side padding, so the card image ends up 16px from the screen edge -- noticeably narrower than the title and subtitle text above it.

## Solution
Remove the internal padding from the card wrapper so the card image and content fill the entire width available within the page's `px-2` container, aligning perfectly with the header text above.

## Technical Details

### File: `src/components/community/MobileEventCarousel.tsx` (line 248)

Change the card wrapper padding from `padding: '6px 8px'` to `padding: '4px 0px'`:

```
Before: padding: '6px 8px'
After:  padding: '4px 0px'
```

This keeps a tiny 4px vertical gap between stacked cards (for the snap boundary) but removes horizontal padding so the card stretches to match the title width. The `rounded-[26px]` corners on the NewsCard still provide visual separation from the edges.

Single-line change, one file.

