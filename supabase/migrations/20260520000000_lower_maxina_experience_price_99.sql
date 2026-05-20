-- Lower the Maxina Experience event series from EUR 149 to EUR 99.
-- Matches by title (covers all events in the series) and is guarded by the
-- current metadata price so any Maxina Experience event priced differently
-- (free, premium, etc.) is left untouched. Updates both the metadata
-- source-of-truth and the denormalized event_ticket_types copy.
--
-- Both UPDATEs filter on price = 149 so VIP/add-on/other tiers on the same
-- events are preserved at their original price.

UPDATE public.event_ticket_types tt
SET price = 99
WHERE tt.price = 149
  AND tt.event_id IN (
    SELECT id
    FROM public.global_community_events
    WHERE title ILIKE '%Maxina Experience%'
      AND (metadata->>'price')::numeric = 149
  );

UPDATE public.global_community_events
SET metadata = jsonb_set(metadata, '{price}', to_jsonb(99))
WHERE title ILIKE '%Maxina Experience%'
  AND (metadata->>'price')::numeric = 149;
