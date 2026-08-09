-- Follow-up to 20260712120000_backfill_sync_global_community_display_name.sql.
--
-- That migration backfilled global_community_profiles.display_name from
-- profiles.full_name. It missed accounts where profiles itself has NEVER had
-- a name (display_name AND full_name both NULL from the moment the row was
-- created) — those show "Unknown User" / the "Community Member" placeholder
-- with nothing in `profiles` to fall back to.
--
-- Root cause, confirmed against auth.users.raw_user_meta_data: the
-- handle_new_user() trigger version live before 2026-04-27
-- (20260122161652_e7be894e-d4dc-43c8-90a9-518c1b6ac83f.sql) only ever read
-- raw_user_meta_data->>'full_name' when populating profiles.full_name /
-- profiles.display_name. Any signup whose client only sent a `display_name`
-- metadata key (not `full_name`) got NULL written to both profiles columns
-- at creation time, permanently, with no later fallback available (that bug
-- was fixed in the 2026-04-27 rewrite of handle_new_user(), so this cannot
-- happen for new signups — this is a backfill for pre-fix accounts only).
--
-- auth.users.raw_user_meta_data still holds the original signup-time name
-- for these accounts, since nothing else ever wrote to profiles/
-- global_community_profiles for them (updated_at == created_at). Recover it.

UPDATE public.profiles p
SET display_name = COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name'),
    full_name = COALESCE(p.full_name, u.raw_user_meta_data->>'full_name'),
    updated_at = now()
FROM auth.users u
WHERE u.id = p.user_id
  AND p.display_name IS NULL
  AND p.full_name IS NULL
  AND COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name') IS NOT NULL;

UPDATE public.global_community_profiles g
SET display_name = p.display_name,
    updated_at = now()
FROM public.profiles p
WHERE p.user_id = g.user_id
  AND g.display_name IS NULL
  AND p.display_name IS NOT NULL;
