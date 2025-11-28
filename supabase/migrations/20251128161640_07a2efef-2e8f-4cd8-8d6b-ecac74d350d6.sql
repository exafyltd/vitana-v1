-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.get_public_event_details(uuid);

-- Create RPC function to get public event details without authentication
-- This allows anonymous users and social media crawlers to access event data
CREATE OR REPLACE FUNCTION public.get_public_event_details(event_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  image_url TEXT,
  event_type TEXT,
  organizer_id UUID,
  organizer_name TEXT,
  organizer_avatar TEXT,
  participant_count BIGINT,
  max_participants INTEGER
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
    e.start_time,
    e.end_time,
    e.location,
    e.image_url,
    e.event_type,
    e.created_by as organizer_id,
    COALESCE(p.display_name, p.full_name, 'Community Host') as organizer_name,
    p.avatar_url as organizer_avatar,
    (SELECT COUNT(*) FROM global_event_participants WHERE event_id = e.id AND status = 'attending') as participant_count,
    e.max_participants
  FROM global_community_events e
  LEFT JOIN profiles p ON p.user_id = e.created_by
  WHERE e.id = event_id
    AND e.is_public = true;
END;
$$;