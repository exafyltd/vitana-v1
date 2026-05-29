-- Confirmation email when an applicant is accepted.
--
-- When `status` flips into `invited` or `active`, fire an HTTP POST to the
-- send-test-user-confirmation Edge Function. The function reads the row,
-- picks one of four templates (device × locale), sends via Resend, and
-- stamps `confirmation_sent_at` to make the operation idempotent.
--
-- Required one-time setup (run via Supabase SQL editor, not in this file):
--   ALTER DATABASE postgres
--     SET app.settings.edge_base_url = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
--   ALTER DATABASE postgres
--     SET app.settings.email_trigger_secret = '<long random string>';
-- The same secret is also stored as the EMAIL_TRIGGER_SECRET env var on the
-- Edge Function so it can validate the X-Trigger-Secret header.

CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.test_user_applications
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'de'
    CHECK (locale IN ('de', 'en'));

ALTER TABLE public.test_user_applications
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

COMMENT ON COLUMN public.test_user_applications.locale IS
  'Language used by the applicant on /apply — drives the confirmation email locale.';

COMMENT ON COLUMN public.test_user_applications.confirmation_sent_at IS
  'Set by the send-test-user-confirmation Edge Function once the email is delivered. Guards against duplicate sends.';

CREATE OR REPLACE FUNCTION public.notify_test_user_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url       text := current_setting('app.settings.edge_base_url', true);
  trigger_secret text := current_setting('app.settings.email_trigger_secret', true);
BEGIN
  IF base_url IS NULL OR trigger_secret IS NULL THEN
    RAISE WARNING
      'notify_test_user_confirmation: missing app.settings.edge_base_url or app.settings.email_trigger_secret — skipping HTTP call';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := base_url || '/functions/v1/send-test-user-confirmation',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Trigger-Secret', trigger_secret
    ),
    body    := jsonb_build_object('application_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_test_user_confirmation
  ON public.test_user_applications;

CREATE TRIGGER trg_send_test_user_confirmation
  AFTER UPDATE OF status ON public.test_user_applications
  FOR EACH ROW
  WHEN (
    NEW.status IN ('invited', 'active')
    AND OLD.status IS DISTINCT FROM NEW.status
    AND NEW.confirmation_sent_at IS NULL
  )
  EXECUTE FUNCTION public.notify_test_user_confirmation();
