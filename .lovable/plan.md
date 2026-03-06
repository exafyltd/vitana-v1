

## Problem: Memories Not Appearing in Category Cards

### What I Found

I traced the full data flow and found **three bugs** causing your memories to disappear after saving:

### Bug 1: Category Not Saved Correctly
Your latest diary entry was saved with tags `["general", "diary"]` instead of `["business-projects", "diary"]`. This means the "Business & Projects" category selection either wasn't applied or defaulted to "general". The AddMemoryDialog has duplicate category IDs in its list (e.g., two entries with `personal-identity`, two with `health-wellness`, two with `lifestyle-routines`), which causes React key conflicts and badge selection bugs.

### Bug 2: ai_memory Items Never Show in Category Detail
`CategoryDetailDialog` filters items by `tags.includes(category.id)`, but items from `ai_memory` come through `useKnowledgeBase` without tags — they have `memoryType` instead. So your 8 existing ai_memory items (facts, preferences, goals) are invisible in the category cards.

### Bug 3: Metadata Progress Miscounts
The `refresh-memory-metadata` edge function counts `ai_memory` by `memory_type` (which stores values like "fact", "preference", "goal" — not category IDs like "business-projects"), so category progress is always wrong for ai_memory items.

### Plan

**File 1: `src/components/memory/AddMemoryDialog.tsx`**
- Fix the `MEMORY_CATEGORIES` list: remove duplicate IDs, add missing categories (digital-footprint, autopilot-settings, future-plans) to match all 13 categories in `MemoryCategoryGrid`
- Each category gets a unique ID so badge selection works correctly

**File 2: `src/hooks/useKnowledgeBase.ts`**
- When mapping `ai_memory` items, include `memoryType` as a tag so `CategoryDetailDialog` filtering works:
  ```
  tags: [mem.memory_type, "ai"].filter(Boolean)
  ```

**File 3: `src/components/memory/CategoryDetailDialog.tsx`**
- Update the filter to also match items by `memoryType` (not just tags):
  ```
  return tags.includes(category.id) || item.memoryType === category.id;
  ```

**File 4: `supabase/functions/refresh-memory-metadata/index.ts`**
- Update the edge function to count diary entries by their category tag (first non-diary/voice/photo tag) mapped to the correct category ID
- For `ai_memory`, map `memory_type` values ("fact", "preference", "goal") to a default category like "personal-identity" since they don't use category IDs

These changes ensure that:
- Saving a memory with a selected category correctly stores that category tag
- All memories (both diary and ai_memory) appear in the correct category cards
- Category progress counts reflect actual data

