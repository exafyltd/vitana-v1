UPDATE global_community_events 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"has_tickets": true}'::jsonb 
WHERE id = '2c339fda-ae04-4578-b2ca-4c7718d7d5e2';