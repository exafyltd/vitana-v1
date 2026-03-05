

# Fix: Keep Edit Button Top-Right on Compact Cards

## Problem
On smaller cards, `flex-wrap` causes the right-side group (timestamp + edit button) to wrap below the category/price badges, moving the edit button away from the top-right corner.

## Solution
Restructure the top section so the edit button (`utilityTopRight`) is positioned independently in the top-right corner, separate from the timestamp. The timestamp will sit with the left-side badges and wrap naturally, while the edit button stays pinned top-right.

### Change in `src/components/crossover/NewsCard.tsx` (lines 351-399)

**Current structure:**
```
[pillar | price]  ←→  [timestamp | edit]
```

**New structure:**
```
[pillar | price | timestamp]  ←→  [edit]
```

Move the timestamp badge into the left-side group with category and price (they all wrap together). Keep only `utilityTopRight` (edit button) on the right side, pinned with `flex-shrink-0 ml-auto`. This ensures the edit button always stays top-right regardless of card width. Large cards are unaffected since everything fits in one row either way.

### Scope
- 1 file: `src/components/crossover/NewsCard.tsx`
- ~15 lines rearranged within the top overlay section

