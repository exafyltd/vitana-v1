-- Update metadata for IN-PERSON events ($99)
UPDATE global_community_events
SET metadata = COALESCE(metadata, '{}'::jsonb) || 
    jsonb_build_object('is_paid', true, 'has_tickets', true, 'price', 99)
WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'
  AND location IS NOT NULL;

-- Update metadata for ONLINE events ($10)
UPDATE global_community_events
SET metadata = COALESCE(metadata, '{}'::jsonb) || 
    jsonb_build_object('is_paid', true, 'has_tickets', true, 'price', 10)
WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'
  AND virtual_link IS NOT NULL 
  AND location IS NULL;