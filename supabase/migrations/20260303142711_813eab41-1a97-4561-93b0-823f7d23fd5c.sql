
-- Drop the duplicate trigger and its function
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON global_community_group_members;
DROP FUNCTION IF EXISTS update_group_member_count();

-- Fix all existing member counts to match reality
UPDATE global_community_groups g
SET member_count = (
  SELECT count(*)
  FROM global_community_group_members m
  WHERE m.group_id = g.id
);
