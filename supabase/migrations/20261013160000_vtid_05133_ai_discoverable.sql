-- =============================================================================
-- VTID-05133 — "Connect your AI": may other members' AI assistants find me?
-- -----------------------------------------------------------------------------
-- A member who connects ChatGPT or Claude to Maxina can ask it to find people
-- in the community (gateway: /mcp/community, find_people / get_my_matches).
-- Another member is shown to such an assistant by identity ONLY when this is
-- true (and `searchable` is true). Default false; no backfill — every member
-- opts in themselves (Settings → Connected apps → Connected AI). The gateway
-- reads it with the service role and fails closed when the lookup errors.
--
-- profile_privacy_settings was created by 20251011073134_… (this repo) with an
-- owner-only RLS policy ("Users manage own privacy settings", FOR ALL), so the
-- member writes their own row; nothing else changes. Plan:
-- exafyltd/vitana-platform docs/validation/VTID-05133/plan-sparring.md.
--
-- Additive, idempotent. Rollback: ALTER TABLE public.profile_privacy_settings
-- DROP COLUMN IF EXISTS ai_discoverable;
-- =============================================================================
BEGIN;

ALTER TABLE public.profile_privacy_settings
  ADD COLUMN IF NOT EXISTS ai_discoverable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profile_privacy_settings.ai_discoverable IS
  'VTID-05133: other members'' connected AI assistants (ChatGPT, Claude via the Maxina Community MCP) may show this member by identity. Default false; set only by the member.';

-- Self-check: the column exists, is NOT NULL and defaults to false.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_privacy_settings'
      AND column_name = 'ai_discoverable' AND is_nullable = 'NO' AND column_default = 'false'
  ) THEN
    RAISE EXCEPTION 'VTID-05133 self-check: profile_privacy_settings.ai_discoverable missing or not NOT NULL DEFAULT false';
  END IF;
END $$;

COMMIT;
