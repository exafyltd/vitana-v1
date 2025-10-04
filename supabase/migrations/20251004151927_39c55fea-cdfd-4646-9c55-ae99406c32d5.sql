-- Backfill profiles display_name and handle; ensure global profile; clear context cache
DO $$
BEGIN
  -- 1) Backfill display_name from full_name/email
  UPDATE public.profiles
  SET display_name = COALESCE(NULLIF(display_name, ''), NULLIF(full_name, ''), NULLIF(email, ''), 'User')
  WHERE display_name IS NULL OR display_name = '';

  -- 2) Backfill handle using generator
  UPDATE public.profiles p
  SET handle = COALESCE(NULLIF(handle, ''), public.generate_unique_handle(p.display_name, p.full_name, p.email))
  WHERE handle IS NULL OR handle = '';

  -- 3) Ensure global_community_profiles exists with display_name
  INSERT INTO public.global_community_profiles (user_id, display_name)
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  LEFT JOIN public.global_community_profiles g ON g.user_id = p.user_id
  WHERE g.user_id IS NULL;

  -- 4) Clear context cache so fresh data is used
  DELETE FROM public.user_context_cache;
END $$;