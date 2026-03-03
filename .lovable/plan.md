

## Root Cause

There are **two duplicate triggers** on the `global_community_group_members` table that both increment/decrement `member_count`:

1. `trg_sync_group_member_count` → calls `sync_group_member_count()`
2. `trigger_update_group_member_count` → calls `update_group_member_count()`

Both do `member_count = member_count + 1` on INSERT and `member_count - 1` on DELETE. Every join **double-counts** (+2 instead of +1), causing the displayed count to drift from reality.

Additionally, `CreateGroupPopup` hardcodes `member_count: 1` on insert, but then the auto-add-creator trigger fires and both count triggers also fire, adding +2 more — so a brand-new group starts at **3** instead of 1.

## Fix

### 1. Drop the duplicate trigger
Drop `trigger_update_group_member_count` (the older/redundant one), keeping only `trg_sync_group_member_count`.

### 2. Fix `CreateGroupPopup.tsx`
Change `member_count: 1` → `member_count: 0` on group creation. The auto-add-creator trigger will fire and the remaining single count trigger will correctly set it to 1.

### 3. Correct existing data
Run a one-time UPDATE to set `member_count` to the actual count from `global_community_group_members` for all groups.

### Files to change
| Target | Change |
|--------|--------|
| Database | `DROP TRIGGER trigger_update_group_member_count ON global_community_group_members;` |
| Database | `DROP FUNCTION update_group_member_count();` |
| Database | One-time data fix: `UPDATE global_community_groups g SET member_count = (SELECT count(*) FROM global_community_group_members m WHERE m.group_id = g.id);` |
| `src/components/CreateGroupPopup.tsx` | Change `member_count: 1` to `member_count: 0` |

