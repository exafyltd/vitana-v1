-- Drop the trg_appilix_push trigger + notify_appilix_push() function.
--
-- Background: the trigger fired on every INSERT INTO user_notifications and
-- called the appilix-push Edge Function via pg_net. The Cloud Run gateway
-- already calls sendAppilixPush() directly from notify_user() for every
-- push-eligible notification, so every chat message produced TWO HTTP calls
-- to Appilix — wasteful and a source of duplicate-delivery side effects.
--
-- Additionally, the DB trigger bypassed all user preference / DND / category
-- gating that lives in the Cloud Run notify_user() function, meaning it
-- could send pushes that the in-app preference system was supposed to
-- suppress.
--
-- We keep the appilix-push Edge Function deployed so any external caller
-- (if any) keeps working, but it is no longer invoked from the database.

DROP TRIGGER IF EXISTS trg_appilix_push ON public.user_notifications;
DROP FUNCTION IF EXISTS public.notify_appilix_push();
