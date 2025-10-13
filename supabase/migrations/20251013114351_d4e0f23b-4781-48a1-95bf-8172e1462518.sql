-- Create event_co_creators table for multiple editors
CREATE TABLE public.event_co_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.global_community_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_co_creators
ALTER TABLE public.event_co_creators ENABLE ROW LEVEL SECURITY;

-- Co-creators can view their assignments
CREATE POLICY "Users can view events they co-create"
ON public.event_co_creators
FOR SELECT
USING (auth.uid() = user_id);

-- Event creators can add co-creators
CREATE POLICY "Event creators can add co-creators"
ON public.event_co_creators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.global_community_events gce
    WHERE gce.id = event_id AND gce.created_by = auth.uid()
  )
);

-- Event creators can remove co-creators
CREATE POLICY "Event creators can remove co-creators"
ON public.event_co_creators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.global_community_events gce
    WHERE gce.id = event_id AND gce.created_by = auth.uid()
  )
);

-- Update RLS policy on global_community_events to include co-creators
DROP POLICY IF EXISTS "Community users can update events they created" ON public.global_community_events;

CREATE POLICY "Community users can update events they created or co-create"
ON public.global_community_events
FOR UPDATE
USING (
  is_community_user() AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_co_creators ecc
      WHERE ecc.event_id = id AND ecc.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Community users can delete events they created" ON public.global_community_events;

CREATE POLICY "Community users can delete events they created or co-create"
ON public.global_community_events
FOR DELETE
USING (
  is_community_user() AND (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_co_creators ecc
      WHERE ecc.event_id = id AND ecc.user_id = auth.uid()
    )
  )
);

-- Add admin_user_number to profiles for internal admin use
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_user_number SERIAL;

-- Create index for faster lookups
CREATE INDEX idx_event_co_creators_user_id ON public.event_co_creators(user_id);
CREATE INDEX idx_event_co_creators_event_id ON public.event_co_creators(event_id);

-- Add Dragan (d.stevanovic@exafy.io) and Jovana (tadicjovana276@gmail.com) as co-creators for all 41 automated events
INSERT INTO public.event_co_creators (event_id, user_id, added_by)
SELECT 
  gce.id,
  'c5a4daf9-190a-4a9e-9638-d6b32f85244a'::uuid, -- Dragan
  '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'::uuid  -- Original creator (Mariia)
FROM public.global_community_events gce
WHERE gce.created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'::uuid;

INSERT INTO public.event_co_creators (event_id, user_id, added_by)
SELECT 
  gce.id,
  'c7d3260d-8311-4a0b-ab1c-53928a37caec'::uuid, -- Jovana
  '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'::uuid  -- Original creator (Mariia)
FROM public.global_community_events gce
WHERE gce.created_by = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b'::uuid;