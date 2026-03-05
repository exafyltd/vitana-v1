CREATE OR REPLACE FUNCTION public.generate_event_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = ''
     OR (TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title) THEN
    base_slug := lower(regexp_replace(NEW.title, '[^a-z0-9]+', '-', 'gi'));
    base_slug := trim(both '-' from base_slug);
    IF length(base_slug) > 80 THEN
      base_slug := left(base_slug, 80);
    END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.global_community_events WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;