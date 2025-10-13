-- Fix RLS policies to correctly check co-creators (there was a bug in the WHERE clause)
DROP POLICY IF EXISTS "Community users can update events they created or co-create" ON public.global_community_events;

CREATE POLICY "Community users can update events they created or co-create"
ON public.global_community_events
FOR UPDATE
USING (
  is_community_user() AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_co_creators ecc
      WHERE ecc.event_id = global_community_events.id AND ecc.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Community users can delete events they created or co-create" ON public.global_community_events;

CREATE POLICY "Community users can delete events they created or co-create"
ON public.global_community_events
FOR DELETE
USING (
  is_community_user() AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_co_creators ecc
      WHERE ecc.event_id = global_community_events.id AND ecc.user_id = auth.uid()
    )
  )
);