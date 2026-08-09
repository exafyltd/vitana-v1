-- Fix: News Feed showing "Community Member" placeholder instead of the
-- author's real name.
--
-- Root cause: global_community_profiles.display_name is the only
-- publicly-readable source the News Feed can query for other users' names
-- (profiles has RLS locked to auth.uid() = user_id, so client code cannot
-- read another user's profiles.full_name directly — that goes through a
-- SECURITY DEFINER RPC instead, e.g. get_user_profile_by_identifier used by
-- the public profile page).
--
-- The old sync_profile_display_name() trigger only mirrored
-- profiles.display_name verbatim. Accounts that only ever had full_name set
-- (never display_name / first_name / last_name via the Account pill) kept
-- global_community_profiles.display_name permanently NULL, even though their
-- profile page correctly falls back to full_name. The News Feed has no such
-- fallback available (RLS), so it rendered the "Community Member" fallback
-- string instead of the real name.

-- 1. Backfill: fill in any global_community_profiles.display_name that is
--    NULL but profiles has a usable name.
UPDATE public.global_community_profiles gcp
SET display_name = COALESCE(p.display_name, p.full_name),
    updated_at = now()
FROM public.profiles p
WHERE p.user_id = gcp.user_id
  AND gcp.display_name IS NULL
  AND COALESCE(p.display_name, p.full_name) IS NOT NULL;

-- 2. Going forward: react to full_name changes too (not just display_name),
--    and always write the best-available name so global_community_profiles
--    never drifts back to NULL while profiles has a name.
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF OLD.display_name IS DISTINCT FROM NEW.display_name
     OR OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    v_name := COALESCE(NEW.display_name, NEW.full_name);
    IF v_name IS NOT NULL THEN
      UPDATE public.global_community_profiles
      SET display_name = v_name,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    UPDATE public.global_community_profiles
    SET avatar_url = NEW.avatar_url, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  IF OLD.avatar_offset_x IS DISTINCT FROM NEW.avatar_offset_x
     OR OLD.avatar_offset_y IS DISTINCT FROM NEW.avatar_offset_y THEN
    UPDATE public.global_community_profiles
    SET avatar_offset_x = NEW.avatar_offset_x,
        avatar_offset_y = NEW.avatar_offset_y,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
