
-- Create General Admission ticket types for all legacy paid events that don't have any ticket types
INSERT INTO public.event_ticket_types (
  event_id,
  name,
  description,
  price,
  currency,
  quantity_available,
  quantity_sold,
  is_active,
  sort_order
)
SELECT 
  e.id as event_id,
  'General Admission' as name,
  'Standard entry ticket' as description,
  COALESCE((e.metadata->>'price')::numeric, 0) as price,
  'EUR' as currency,
  100 as quantity_available,
  0 as quantity_sold,
  true as is_active,
  1 as sort_order
FROM global_community_events e
WHERE (e.metadata->>'is_paid')::boolean = true
  AND NOT EXISTS (
    SELECT 1 FROM event_ticket_types tt WHERE tt.event_id = e.id
  );
