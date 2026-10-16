-- =============================================================================
-- VTID-05206 — New-member welcome: may the community be introduced to me?
-- -----------------------------------------------------------------------------
-- The News Feed shows a "new member" card for members who joined in the last
-- 7 days, so the community can greet them (VTID-04574). From now on a member
-- appears there only when global_community_profiles.community_intro_opt_in is
-- true. Plan: exafyltd/vitana-platform .kiro/specs/new-member-welcome/
-- (sparred, owner approved 2026-10-15; owner decision D1 = default ON).
--
--   * Existing rows get FALSE (the ADD COLUMN default) — nobody who registered
--     before this migration is introduced without choosing it.
--   * The default then becomes TRUE, so every member who registers afterwards
--     is introduced unless they switch it off (Settings → Privacy, or the
--     registration step). handle_new_user() inserts (user_id, display_name,
--     is_visible) only, so new signups take the column default; nothing ever
--     deletes and re-inserts a row, so nothing resets a member's choice.
--
-- The member writes their own row through the existing owner policy
-- "Users can manage their own global profile" (FOR ALL, auth.uid() = user_id);
-- no policy, grant, trigger, REPLICA IDENTITY or publication changes. The
-- self-check below fails the migration if any of that moved.
--
-- Additive, idempotent. Rollback:
--   ALTER TABLE public.global_community_profiles DROP COLUMN IF EXISTS community_intro_opt_in;
-- =============================================================================
BEGIN;

-- Existing members: false.
ALTER TABLE public.global_community_profiles
  ADD COLUMN IF NOT EXISTS community_intro_opt_in boolean NOT NULL DEFAULT false;

-- Members who register from now on: true (owner decision D1).
ALTER TABLE public.global_community_profiles
  ALTER COLUMN community_intro_opt_in SET DEFAULT true;

COMMENT ON COLUMN public.global_community_profiles.community_intro_opt_in IS
  'VTID-05206: show this member on the News Feed "new member" card (first 7 days). Default true for members registering after the migration, false for members who existed before it; set by the member (Settings → Privacy, registration step).';

-- Self-check: the column is right, and realtime / RLS are untouched.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'global_community_profiles'
      AND column_name = 'community_intro_opt_in' AND data_type = 'boolean'
      AND is_nullable = 'NO' AND column_default = 'true'
  ) THEN
    RAISE EXCEPTION 'VTID-05206 self-check: global_community_profiles.community_intro_opt_in missing or not boolean NOT NULL DEFAULT true';
  END IF;
  IF (SELECT relreplident FROM pg_class WHERE oid = 'public.global_community_profiles'::regclass) <> 'f' THEN
    RAISE EXCEPTION 'VTID-05206 self-check: global_community_profiles is no longer REPLICA IDENTITY FULL';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
                        AND tablename = 'global_community_profiles') THEN
    RAISE EXCEPTION 'VTID-05206 self-check: global_community_profiles left the supabase_realtime publication';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'global_community_profiles'
                   AND policyname = 'Users can manage their own global profile') THEN
    RAISE EXCEPTION 'VTID-05206 self-check: the owner policy on global_community_profiles is missing';
  END IF;
END $$;

COMMIT;
