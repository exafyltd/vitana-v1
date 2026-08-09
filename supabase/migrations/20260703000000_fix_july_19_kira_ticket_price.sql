-- Keep the July 19 KIRA Rooftop event's denormalized list price and its
-- purchasable ticket price in sync. The event was added after the broad
-- 20260520000000 price correction, leaving the ticket row at EUR 149 while
-- metadata (used by event cards) already showed EUR 99.

UPDATE public.global_community_events
SET metadata = jsonb_set(
  jsonb_set(COALESCE(metadata, '{}'::jsonb), '{price}', to_jsonb(99)),
  '{display_currency}',
  to_jsonb('EUR'::text)
)
WHERE id = '3ed6c7e1-d284-42bb-bc0f-ef8e8c655bb7';

UPDATE public.event_ticket_types
SET price = 99,
    currency = 'EUR'
WHERE id = '2528505b-007b-421b-bc22-064894706e2e'
  AND event_id = '3ed6c7e1-d284-42bb-bc0f-ef8e8c655bb7';
