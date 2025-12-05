-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_public_event_details(uuid);

-- Recreate with ticket information included
CREATE OR REPLACE FUNCTION public.get_public_event_details(event_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  event_type text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  max_participants integer,
  participant_count integer,
  image_url text,
  organizer_name text,
  organizer_avatar text,
  metadata jsonb,
  has_tickets boolean,
  lowest_ticket_price numeric,
  is_paid_event boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.event_type,
    e.location,
    e.start_time,
    e.end_time,
    e.max_participants,
    e.participant_count,
    e.image_url,
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Event Organizer') as organizer_name,
    COALESCE(gcp.avatar_url, p.avatar_url) as organizer_avatar,
    e.metadata,
    EXISTS (
      SELECT 1 FROM public.event_ticket_types ett 
      WHERE ett.event_id = e.id AND ett.is_active = true
    ) as has_tickets,
    (
      SELECT MIN(ett.price) FROM public.event_ticket_types ett 
      WHERE ett.event_id = e.id AND ett.is_active = true
    ) as lowest_ticket_price,
    COALESCE(
      (SELECT MIN(ett.price) > 0 FROM public.event_ticket_types ett 
       WHERE ett.event_id = e.id AND ett.is_active = true),
      false
    ) as is_paid_event
  FROM public.global_community_events e
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = e.created_by
  LEFT JOIN public.profiles p ON p.user_id = e.created_by
  WHERE e.id = get_public_event_details.event_id;
END;
$$;

-- Create RLS policy to allow anyone to view ticket types (needed for public event pages)
DROP POLICY IF EXISTS "Anyone can view active ticket types" ON public.event_ticket_types;

CREATE POLICY "Anyone can view active ticket types"
ON public.event_ticket_types
FOR SELECT
USING (is_active = true);