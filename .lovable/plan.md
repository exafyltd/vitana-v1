

# Fix: Auto-regenerate event slug when title changes

## Problem
The event was renamed from "Sunrise Detox Flow" to "Maxina Experience by Janina Restaurant", but the URL slug is still `sunrise-detox-flow`. The current DB trigger only generates a slug when it's NULL or empty — it doesn't update when the title changes.

## Changes

### 1. Update the `generate_event_slug()` trigger function (migration)
Add a condition: if `TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title`, regenerate the slug.

```sql
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
```

### 2. Fix existing stale slugs (data update via insert tool)
Reset slugs for events whose titles no longer match their slugs:

```sql
UPDATE global_community_events SET slug = NULL
WHERE title ILIKE '%Maxina Experience%';
```

This triggers the function to regenerate correct slugs automatically.

### Scope
- 1 migration (update trigger function)
- 1 data fix (reset stale slugs)
- No application code changes needed

