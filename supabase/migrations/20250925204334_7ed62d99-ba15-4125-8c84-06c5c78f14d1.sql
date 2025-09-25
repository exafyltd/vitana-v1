-- Remove duplicate calendar events - keep only the earliest entry for each user/message combo
DELETE FROM calendar_events 
WHERE id IN (
  SELECT ce1.id 
  FROM calendar_events ce1
  JOIN calendar_events ce2 ON ce1.user_id = ce2.user_id AND ce1.source_message_id = ce2.source_message_id
  WHERE ce1.source_message_id IS NOT NULL 
    AND ce1.created_at > ce2.created_at
);

-- Now create the unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_calendar_event_user_source
ON public.calendar_events (user_id, source_message_id)
WHERE source_message_id IS NOT NULL;