
## Fix: Inbox Search — Search Results Not Displayed

### Root Cause

The search filter runs correctly and produces the right `searchFiltered` array. However, at **line 805**, the sort + deduplicate pipeline reads from `filteredThreads` (the original, unfiltered list) instead of `searchFiltered`:

```typescript
// Line 805 — BUG: uses filteredThreads, not searchFiltered
const sortedThreads = [...filteredThreads]
  .sort(...)
  .reduce(...);
```

So even though the empty-state check at line 785 uses `searchFiltered`, the actual rendered list (`sortedThreads`) always shows every conversation regardless of what is typed. The user sees all their conversations no matter what name they type, making search appear "broken."

### The Fix

**One-line change in `src/pages/Messages.tsx`** — line 805:

```typescript
// BEFORE (broken):
const sortedThreads = [...filteredThreads]

// AFTER (fixed):
const sortedThreads = [...searchFiltered]
```

This ensures the sort + dedup pipeline operates on the already-search-filtered list, so the rendered cards match the search query.

### Why Only One Line?

The rest of the logic is correct:
- `searchFiltered` is computed properly (lines 776–783)
- The empty-state guard already uses `searchFiltered` (line 785)
- The `ExpandableSearchButton` already fires `onSearch` live on every keystroke (from the previous fix)
- `inboxSearchQuery` state is wired correctly

The single missing link: the sort/render step reads `filteredThreads` instead of `searchFiltered`.

### Files to Edit
- `src/pages/Messages.tsx` — change `filteredThreads` → `searchFiltered` on line 805 (1 character change, 1 word)
