-- Add avatar position offset columns for profile picture repositioning
-- Values are 0-100 representing percentage (50 = center, default)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_offset_x SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_offset_y SMALLINT NOT NULL DEFAULT 50;

COMMENT ON COLUMN public.profiles.avatar_offset_x IS 'Horizontal position % for avatar crop (0=left, 50=center, 100=right)';
COMMENT ON COLUMN public.profiles.avatar_offset_y IS 'Vertical position % for avatar crop (0=top, 50=center, 100=bottom)';

ALTER TABLE public.global_community_profiles
  ADD COLUMN IF NOT EXISTS avatar_offset_x SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS avatar_offset_y SMALLINT NOT NULL DEFAULT 50;

-- Update sync trigger to include avatar offsets
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    UPDATE public.global_community_profiles
    SET display_name = NEW.display_name, updated_at = now()
    WHERE user_id = NEW.user_id;
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
