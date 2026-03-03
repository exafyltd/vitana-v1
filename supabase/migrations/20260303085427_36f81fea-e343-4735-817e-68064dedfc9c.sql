
-- Add unique constraint on slug (filter out nulls)
CREATE UNIQUE INDEX IF NOT EXISTS unique_event_slug ON public.global_community_events (slug) WHERE slug IS NOT NULL;

-- Function to auto-generate slug from title
CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Only generate if slug is null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.title, '[^a-z0-9]+', '-', 'gi'));
    base_slug := trim(both '-' from base_slug);
    
    -- Truncate to reasonable length
    IF length(base_slug) > 80 THEN
      base_slug := left(base_slug, 80);
      base_slug := trim(both '-' from base_slug);
    END IF;
    
    final_slug := base_slug;
    
    -- Check for collisions and add suffix
    WHILE EXISTS (SELECT 1 FROM public.global_community_events WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-generate slug on insert/update
CREATE TRIGGER trigger_generate_event_slug
BEFORE INSERT OR UPDATE ON public.global_community_events
FOR EACH ROW
EXECUTE FUNCTION public.generate_event_slug();
