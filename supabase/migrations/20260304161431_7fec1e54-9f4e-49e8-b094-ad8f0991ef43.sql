-- One-time sync: update event_ticket_types prices from event metadata (source of truth)
UPDATE public.event_ticket_types t
SET 
  price = COALESCE((e.metadata->>'price')::numeric, t.price),
  currency = COALESCE(UPPER(e.metadata->>'display_currency'), t.currency)
FROM public.global_community_events e
WHERE t.event_id = e.id
  AND t.is_active = true
  AND (e.metadata->>'has_tickets')::boolean = true
  AND (
    t.price IS DISTINCT FROM COALESCE((e.metadata->>'price')::numeric, t.price)
    OR t.currency IS DISTINCT FROM COALESCE(UPPER(e.metadata->>'display_currency'), t.currency)
  )