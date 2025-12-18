-- Add slug column to global_community_events
ALTER TABLE global_community_events 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_global_community_events_slug ON global_community_events(slug);

-- Function to generate URL-safe slug from title
CREATE OR REPLACE FUNCTION generate_event_slug(event_title TEXT, event_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
  random_suffix TEXT;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(trim(event_title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Limit length to 60 chars
  IF length(base_slug) > 60 THEN
    base_slug := substring(base_slug from 1 for 60);
    base_slug := trim(both '-' from base_slug);
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness (excluding the current event if updating)
  WHILE EXISTS (
    SELECT 1 FROM global_community_events 
    WHERE slug = final_slug 
    AND (event_id IS NULL OR id != event_id)
  ) LOOP
    counter := counter + 1;
    IF counter > 5 THEN
      -- After 5 attempts, use random suffix
      random_suffix := substring(md5(random()::text) from 1 for 4);
      final_slug := base_slug || '-' || random_suffix;
    ELSE
      final_slug := base_slug || '-' || counter;
    END IF;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Function to resolve slug or UUID to event details
CREATE OR REPLACE FUNCTION resolve_event_by_slug(identifier TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  event_type TEXT,
  location TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  max_participants INTEGER,
  participant_count INTEGER,
  image_url TEXT,
  slug TEXT,
  organizer_name TEXT,
  organizer_avatar TEXT,
  metadata JSONB,
  has_tickets BOOLEAN,
  lowest_ticket_price NUMERIC,
  is_paid_event BOOLEAN,
  is_sold_out BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_uuid UUID;
BEGIN
  -- Check if identifier is a valid UUID
  BEGIN
    event_uuid := identifier::UUID;
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
    COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'Anonymous')::TEXT as organizer_name,
    p.avatar_url::TEXT as organizer_avatar,
    e.metadata,
    EXISTS (SELECT 1 FROM event_ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as has_tickets,
    (SELECT MIN(tt.price) FROM event_ticket_types tt WHERE tt.event_id = e.id AND tt.is_active = true) as lowest_ticket_price,
    COALESCE((e.metadata->>'is_paid')::boolean, false) as is_paid_event,
    COALESCE((e.metadata->>'is_sold_out')::boolean, false) as is_sold_out
  FROM global_community_events e
  LEFT JOIN profiles p ON e.created_by = p.user_id
  WHERE (event_uuid IS NOT NULL AND e.id = event_uuid)
     OR (event_uuid IS NULL AND e.slug = identifier);
END;
$$;

-- Backfill existing events with slugs
DO $$
DECLARE
  event_record RECORD;
  new_slug TEXT;
BEGIN
  FOR event_record IN 
    SELECT id, title FROM global_community_events WHERE slug IS NULL
  LOOP
    new_slug := generate_event_slug(event_record.title, event_record.id);
    UPDATE global_community_events SET slug = new_slug WHERE id = event_record.id;
  END LOOP;
END;
$$;

-- Trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION auto_generate_event_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_event_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_event_slug ON global_community_events;
CREATE TRIGGER trigger_auto_generate_event_slug
  BEFORE INSERT ON global_community_events
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_event_slug();