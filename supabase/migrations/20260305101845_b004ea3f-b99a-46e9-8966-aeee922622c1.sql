-- Fix existing stale slugs by setting them to NULL so the trigger regenerates them
UPDATE global_community_events SET slug = NULL WHERE title ILIKE '%Maxina Experience%';