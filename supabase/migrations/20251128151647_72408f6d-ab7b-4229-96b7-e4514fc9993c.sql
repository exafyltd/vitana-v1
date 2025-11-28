-- Create public event details function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_public_event_details(event_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'title', title,
    'description', description,
    'event_type', event_type,
    'location', location,
    'virtual_link', virtual_link,
    'start_time', start_time,
    'end_time', end_time,
    'max_participants', max_participants,
    'participant_count', participant_count,
    'image_url', image_url
  ) INTO result
  FROM global_community_events
  WHERE id = event_id;
  
  RETURN result;
END;
$$;