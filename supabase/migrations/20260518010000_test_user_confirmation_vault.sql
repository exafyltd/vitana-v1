-- Switch the confirmation-email trigger from `current_setting('app.settings.*')`
-- to Supabase Vault, because Supabase-managed projects do not allow
-- `ALTER DATABASE postgres SET ...` from the SQL editor.
--
-- Required one-time setup (Supabase dashboard → Project Settings → Vault →
-- New secret):
--   Name:  email_trigger_secret
--   Value: <the same long random string stored in the EMAIL_TRIGGER_SECRET
--          Edge Function secret>
--
-- The Edge Function base URL is project-public (it appears in every frontend
-- API call), so we hard-code it here instead of treating it as a secret.

CREATE OR REPLACE FUNCTION public.notify_test_user_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_url       constant text := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/send-test-user-confirmation';
  trigger_secret text;
BEGIN
  SELECT decrypted_secret
    INTO trigger_secret
    FROM vault.decrypted_secrets
   WHERE name = 'email_trigger_secret'
   LIMIT 1;

  IF trigger_secret IS NULL THEN
    RAISE WARNING
      'notify_test_user_confirmation: vault secret "email_trigger_secret" not found — skipping HTTP call';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := edge_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Trigger-Secret', trigger_secret
    ),
    body    := jsonb_build_object('application_id', NEW.id)
  );

  RETURN NEW;
END;
$$;
