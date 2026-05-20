-- Lower the Maxina Experience event series from EUR 149 to EUR 99.
-- Matches by title (covers all events in the series) and is guarded by the
-- current metadata price so any Maxina Experience event priced differently
-- (free, premium, etc.) is left untouched. Updates both the metadata
-- source-of-truth and the denormalized event_ticket_types copy.

WITH target_events AS (
  SELECT id
  FROM public.global_community_events
  WHERE title ILIKE '%Maxina Experience%'
    AND (metadata->>'price')::numeric = 149
)
UPDATE public.global_community_events e
SET metadata = jsonb_set(e.metadata, '{price}', to_jsonb(99))
FROM target_events t
WHERE e.id = t.id;

UPDATE public.event_ticket_types tt
SET price = 99, currency = 'EUR'
WHERE tt.event_id IN (
  SELECT id
  FROM public.global_community_events
  WHERE title ILIKE '%Maxina Experience%'
    AND (metadata->>'price')::numeric = 99
);
