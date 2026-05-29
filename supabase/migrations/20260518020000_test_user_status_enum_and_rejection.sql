-- Tighten `status` into a real Postgres enum so Supabase Studio renders it as
-- a dropdown (no more typo-prone free-text editing), and broaden the email
-- trigger so 'rejected' fires a waitlist email instead of nothing.
--
-- Live-DB application notes:
--   * The migration is also written out as a copy-pasteable SQL block in
--     the PR description, because this repo doesn't auto-run migrations.
--   * Run-once safety: any existing row whose status value isn't in the new
--     enum is normalised to 'pending' before the type swap, so the cast
--     can't fail on legacy values like 'verified' or 'invited'.
--   * The trigger is dropped BEFORE the ALTER COLUMN TYPE step because
--     Postgres refuses `ALTER COLUMN ... TYPE` on a column referenced by
--     a trigger definition (error 0A000). Recreated at the end.

DROP TRIGGER IF EXISTS trg_send_test_user_confirmation
  ON public.test_user_applications;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_user_application_status') THEN
    CREATE TYPE public.test_user_application_status AS ENUM ('pending', 'active', 'rejected');
  END IF;
END $$;

UPDATE public.test_user_applications
   SET status = 'pending'
 WHERE status NOT IN ('pending', 'active', 'rejected');

ALTER TABLE public.test_user_applications
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.test_user_applications
  ALTER COLUMN status TYPE public.test_user_application_status
  USING status::public.test_user_application_status;

ALTER TABLE public.test_user_applications
  ALTER COLUMN status SET DEFAULT 'pending'::public.test_user_application_status;

CREATE TRIGGER trg_send_test_user_confirmation
  AFTER UPDATE OF status ON public.test_user_applications
  FOR EACH ROW
  WHEN (
    NEW.status IN ('active', 'rejected')
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.confirmation_sent_at IS NULL
  )
  EXECUTE FUNCTION public.notify_test_user_confirmation();
