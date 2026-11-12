-- =============================================================================
-- VTID-05475 — Community introductions are an explicit choice
-- -----------------------------------------------------------------------------
-- Owner decision 2026-10-30 (final, supersedes VTID-05206 decision D1 "default
-- ON"): nobody is publicly introduced — no News Feed "new member" card, no Say
-- Hello eligibility — until they actively choose "Yes, introduce me 👋". The
-- registration step offers two unselected choices ("Yes, introduce me 👋" /
-- "Not now"); Settings → Privacy keeps the switch (default off). The owner
-- authorized the backfill below: preserve every recorded explicit choice
-- (opt-in and opt-out) and remove automatic inclusion where no affirmative
-- choice was ever recorded. Plan: exafyltd/vitana-platform
-- .kiro/specs/welcome-finish-r2/ (sparred, converged, policy-approved).
--
-- This migration does three things, in one transaction, idempotently:
--   1. ADD COLUMN community_intro_choice_at timestamptz NULL — the marker that
--      records "the member made an explicit choice" (set by
--      src/lib/community-intro.ts on every write). NULL = no recorded choice.
--   2. ALTER COLUMN community_intro_opt_in SET DEFAULT false — new signups are
--      not introduced until they choose Yes (VTID-05206 had set it true).
--   3. BACKFILL: clear automatic inclusion for rows with NO recorded choice.
--      A row whose community_intro_choice_at is set (an explicit yes OR an
--      explicit no) is NEVER touched — its recorded choice is preserved. Only
--      rows that are still true purely by the old default-ON are set to false.
--      The 251 pre-rollout rows are already false and are not changed.
--
--   ⚠️ R2-F1 disclosure (sparring round 2): during the window between this
--   code deploying and this migration being applied, the app's backward-
--   compatible fallback writes only community_intro_opt_in (no marker, because
--   the column does not exist yet). Any explicit opt-in made in that window has
--   no marker and so is reverted to false by this backfill. The window is
--   bounded by the owner stop on applying (collaboration.md §7d) and the blast
--   radius is tiny (2 default-true rows today). The owner is made aware of this
--   in docs/validation/VTID-05475/owner-decision.md before approving the apply.
--
-- The member writes their own row through the existing owner policy
-- "Users can manage their own global profile" (FOR ALL, auth.uid() = user_id);
-- no policy, grant, trigger, REPLICA IDENTITY or publication changes. The
-- self-check below fails (and rolls back) the migration if any of that moved,
-- or if any recorded choice was altered.
--
-- Additive + a bounded backfill, idempotent. Rollback:
--   ALTER TABLE public.global_community_profiles DROP COLUMN IF EXISTS community_intro_choice_at;
--   ALTER TABLE public.global_community_profiles ALTER COLUMN community_intro_opt_in SET DEFAULT true;
-- (the backfilled false values cannot be distinguished from genuine opt-outs
-- afterwards; the owner authorized clearing them).
-- =============================================================================
BEGIN;

-- The marker: when did the member make an explicit choice? NULL = never.
ALTER TABLE public.global_community_profiles
  ADD COLUMN IF NOT EXISTS community_intro_choice_at timestamptz NULL;

-- New signups are not introduced until they choose Yes (was true under VTID-05206).
ALTER TABLE public.global_community_profiles
  ALTER COLUMN community_intro_opt_in SET DEFAULT false;

COMMENT ON COLUMN public.global_community_profiles.community_intro_choice_at IS
  'VTID-05475: timestamp of the member''s explicit community-intro choice (Yes or Not now). NULL = no recorded choice. A row with this set is never changed by the explicit-choice backfill.';
COMMENT ON COLUMN public.global_community_profiles.community_intro_opt_in IS
  'VTID-05475: show this member on the News Feed "new member" card (first 7 days) and make them Say-Hello eligible. Default false; true only when the member explicitly chose "Yes, introduce me". Recorded choices carry community_intro_choice_at.';

-- Capture the count of rows with a recorded choice that are introduced (true),
-- BEFORE the backfill, so the self-check can prove the backfill changed none of
-- them. Temp table is dropped on COMMIT; re-runnable (DROP IF EXISTS first).
DROP TABLE IF EXISTS _vtid_05475_pre_backfill;
CREATE TEMP TABLE _vtid_05475_pre_backfill ON COMMIT DROP AS
  SELECT
    count(*) FILTER (WHERE community_intro_choice_at IS NOT NULL AND community_intro_opt_in) AS recorded_true,
    count(*) FILTER (WHERE community_intro_choice_at IS NOT NULL)                            AS recorded_total
  FROM public.global_community_profiles;

-- Backfill: clear automatic inclusion where NO explicit choice was ever recorded.
-- Rows with a recorded choice (marker set) are untouched — explicit yes and
-- explicit no are both preserved.
UPDATE public.global_community_profiles
   SET community_intro_opt_in = false
 WHERE community_intro_choice_at IS NULL
   AND community_intro_opt_in;

-- Self-check: the backfill preserved every recorded choice, cleared every
-- unmarked inclusion, the columns are right, and realtime / RLS are untouched.
DO $$
DECLARE
  recorded_true_before   int;
  recorded_total_before  int;
  recorded_true_after    int;
  recorded_total_after   int;
  still_unmarked_true     int;
BEGIN
  SELECT recorded_true, recorded_total
    INTO recorded_true_before, recorded_total_before
    FROM _vtid_05475_pre_backfill;

  SELECT count(*) FILTER (WHERE community_intro_choice_at IS NOT NULL AND community_intro_opt_in),
         count(*) FILTER (WHERE community_intro_choice_at IS NOT NULL)
    INTO recorded_true_after, recorded_total_after
    FROM public.global_community_profiles;

  -- Every row with a recorded choice is preserved: the set of marked rows and
  -- how many of them are introduced must be identical before and after.
  IF recorded_true_after <> recorded_true_before OR recorded_total_after <> recorded_total_before THEN
    RAISE EXCEPTION 'VTID-05475 self-check: a row with a recorded choice changed during backfill (true before=%, after=%; total before=%, after=%)',
      recorded_true_before, recorded_true_after, recorded_total_before, recorded_total_after;
  END IF;

  -- No row without a recorded choice may still be introduced.
  SELECT count(*) INTO still_unmarked_true
    FROM public.global_community_profiles
   WHERE community_intro_choice_at IS NULL AND community_intro_opt_in;
  IF still_unmarked_true <> 0 THEN
    RAISE EXCEPTION 'VTID-05475 self-check: % row(s) without a recorded choice are still introduced after backfill', still_unmarked_true;
  END IF;

  -- The marker column is timestamptz and nullable.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'global_community_profiles'
      AND column_name = 'community_intro_choice_at' AND data_type = 'timestamp with time zone'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'VTID-05475 self-check: community_intro_choice_at missing or not timestamptz NULL';
  END IF;

  -- community_intro_opt_in is boolean NOT NULL DEFAULT false.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'global_community_profiles'
      AND column_name = 'community_intro_opt_in' AND data_type = 'boolean'
      AND is_nullable = 'NO' AND column_default = 'false'
  ) THEN
    RAISE EXCEPTION 'VTID-05475 self-check: community_intro_opt_in missing or not boolean NOT NULL DEFAULT false';
  END IF;

  -- Realtime / RLS unchanged (copied verbatim from the VTID-05206 self-check).
  IF (SELECT relreplident FROM pg_class WHERE oid = 'public.global_community_profiles'::regclass) <> 'f' THEN
    RAISE EXCEPTION 'VTID-05475 self-check: global_community_profiles is no longer REPLICA IDENTITY FULL';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables
                      WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
                        AND tablename = 'global_community_profiles') THEN
    RAISE EXCEPTION 'VTID-05475 self-check: global_community_profiles left the supabase_realtime publication';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'global_community_profiles'
                   AND policyname = 'Users can manage their own global profile') THEN
    RAISE EXCEPTION 'VTID-05475 self-check: the owner policy on global_community_profiles is missing';
  END IF;
END $$;

COMMIT;
