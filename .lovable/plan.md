

## Problem: Memories Save as "general" Instead of Selected Category

### Root Cause

I confirmed the bug by querying your database. Both recent entries have tags `["general", "diary"]` -- the "business-projects" category was never persisted.

The bug is in `AddMemoryDialog.tsx` line 40:

```typescript
const [selectedCategory, setSelectedCategory] = useState(defaultCategory || "");
```

`useState` only uses its initial value **on first mount**. When you open the dialog from the "Business & Projects" category card, the component may already be mounted (it's rendered in `MemoryCategoryGrid` permanently), so `defaultCategory` changing to `"business-projects"` has no effect on the state. The category stays as `""`, and line 98 falls back to `"general"`.

### Plan

**Fix 1: `src/components/memory/AddMemoryDialog.tsx`**
- Add a `useEffect` that syncs `selectedCategory` whenever `defaultCategory` or `open` changes:
  ```typescript
  useEffect(() => {
    if (open) {
      setSelectedCategory(defaultCategory || "");
    }
  }, [open, defaultCategory]);
  ```
- This ensures that when the dialog opens from a category card, the correct category is pre-selected.

**Fix 2: Fix past entries via SQL update**
- Run an update on the two incorrectly-tagged diary entries for your user to change `["general", "diary"]` to `["business-projects", "diary"]` (the entries about Maxina Experience events).

**Fix 3: Refresh metadata**
- After fixing past entries, invoke `refresh-memory-metadata` to recalculate the category counts so the Business & Projects card shows the correct number.

No changes needed to `CategoryDetailDialog`, `useKnowledgeBase`, or the edge function -- those were already fixed in the last round.

