-- Fix resolve_event_by_slug to use profiles.full_name (profiles has no first_name/last_name)
CREATE OR REPLACE FUNCTION public.resolve_event_by_slug(identifier text)
RETURNS TABLE(
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
  slug text,
  organizer_name text,
  organizer_avatar text,
  metadata jsonb,
  has_tickets boolean,
  lowest_ticket_price numeric,
  is_paid_event boolean,
  is_sold_out boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_uuid uuid;
BEGIN
  -- Try to interpret identifier as UUID; if it fails, treat it as a slug
  BEGIN
    event_uuid := identifier::uuid;
  EXCEPTION WHEN OTHERS THEN
    event_uuid := NULL;
  END;

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
    e.slug,
    -- FIX: profiles uses full_name (not first_name/last_name)
    COALESCE(p.display_name, p.full_name, 'Anonymous')::text AS organizer_name,
    p.avatar_url::text AS organizer_avatar,
    e.metadata,
    EXISTS (
      SELECT 1
      FROM public.event_ticket_types tt
      WHERE tt.event_id = e.id
        AND tt.is_active = true
    ) AS has_tickets,
    (
      SELECT MIN(tt.price)
      FROM public.event_ticket_types tt
      WHERE tt.event_id = e.id
        AND tt.is_active = true
    ) AS lowest_ticket_price,
    COALESCE((e.metadata->>'is_paid')::boolean, false) AS is_paid_event,
    COALESCE((e.metadata->>'is_sold_out')::boolean, false) AS is_sold_out
  FROM public.global_community_events e
  LEFT JOIN public.profiles p
    ON p.user_id = e.created_by
  WHERE (event_uuid IS NOT NULL AND e.id = event_uuid)
     OR (event_uuid IS NULL AND e.slug = identifier)
  LIMIT 1;
END;
$function$;