-- Insert ticket types for IN-PERSON events ($99)
INSERT INTO event_ticket_types (event_id, name, description, price, currency, quantity_available, is_active)
SELECT 
  id as event_id,
  'General Admission' as name,
  'Standard ticket for in-person attendance' as description,
  99 as price,
  'USD' as currency,
  100 as quantity_available,
  true as is_active
FROM global_community_events
WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'
  AND location IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_ticket_types ett WHERE ett.event_id = global_community_events.id
  );

-- Insert ticket types for ONLINE events ($10)
INSERT INTO event_ticket_types (event_id, name, description, price, currency, quantity_available, is_active)
SELECT 
  id as event_id,
  'General Admission' as name,
  'Virtual access ticket' as description,
  10 as price,
  'USD' as currency,
  100 as quantity_available,
  true as is_active
FROM global_community_events
WHERE created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'
  AND virtual_link IS NOT NULL 
  AND location IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_ticket_types ett WHERE ett.event_id = global_community_events.id
  );