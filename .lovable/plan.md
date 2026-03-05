

# Fix Badge Layout on Compact Event Cards

## Problem
On smaller (compact) event cards, the top badge row overflows because it crams pillar badge, price badge, timestamp, and edit button all in one horizontal `flex` row. On large cards there's enough width, but compact cards clip or hide the edit button and badges look messy.

## Solution
Make the top badge section responsive within `NewsCard.tsx`:

### Change in `src/components/crossover/NewsCard.tsx` (lines 351-399)

**Current:** Single `flex justify-between items-center` row with left group (pillar + price) and right group (timestamp + utility).

**Updated:** Wrap the top section so it gracefully handles overflow on smaller cards:
- Change the top container to `flex flex-wrap justify-between items-start gap-y-2`
- Add `min-w-0` and `flex-shrink` to allow badge groups to compress
- On the right side, ensure the timestamp text truncates on compact cards by adding `max-w-[160px] truncate` to the timestamp span
- Keep the edit icon (utilityTopRight) always visible by ensuring it doesn't get pushed off

This is a single-file change (~10 lines modified) in `NewsCard.tsx`, affecting only the top overlay section layout. Large cards are unaffected since they have enough width for a single row.

