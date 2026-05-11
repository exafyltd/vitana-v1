-- Appilix targeted push identity alignment.
--
-- Appilix targets devices by the user_identity registered in the WebView.
-- The app now registers profiles.vitana_id, so database-triggered push calls
-- must send the same recipient identity instead of the Supabase UUID.

CREATE OR REPLACE FUNCTION public.notify_appilix_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_identity text;
BEGIN
  -- Only fire for push-eligible notifications.
  IF NEW.channel IN ('push_and_inapp', 'push') THEN
    v_user_identity := NULLIF(NEW.recipient_vitana_id, '');

    IF v_user_identity IS NULL THEN
      SELECT NULLIF(p.vitana_id, '')
        INTO v_user_identity
        FROM public.profiles p
       WHERE p.user_id = NEW.user_id
       LIMIT 1;
    END IF;

    v_user_identity := COALESCE(v_user_identity, NEW.user_id::text);

    PERFORM net.http_post(
      url := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/appilix-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw'
      ),
      body := jsonb_build_object(
        'user_identity', v_user_identity,
        'fallback_user_identity', NEW.user_id::text,
        'notification_title', COALESCE(NEW.title, 'New notification'),
        'notification_body', COALESCE(NEW.body, ''),
        'open_link_url', 'https://vitana-v1.lovable.app' || COALESCE(NEW.data->>'url', '/inbox')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_body_preview text;
  v_tenant_id uuid;
  v_recipient_vitana_id text;
BEGIN
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_notifications
     WHERE user_id = NEW.receiver_id
       AND type = 'new_chat_message'
       AND data->>'message_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, handle, 'Someone')
    INTO v_sender_name
    FROM public.profiles
   WHERE id = NEW.sender_id;

  v_recipient_vitana_id := NULLIF(NEW.receiver_vitana_id, '');

  IF v_recipient_vitana_id IS NULL THEN
    SELECT p.vitana_id
      INTO v_recipient_vitana_id
      FROM public.profiles p
     WHERE p.user_id = NEW.receiver_id
     LIMIT 1;
  END IF;

  v_body_preview := LEFT(COALESCE(NEW.content, ''), 100);

  SELECT tenant_id
    INTO v_tenant_id
    FROM public.user_tenants
   WHERE user_id = NEW.receiver_id AND is_primary = true
   LIMIT 1;

  v_tenant_id := COALESCE(v_tenant_id, NEW.tenant_id);

  INSERT INTO public.user_notifications (
    user_id,
    tenant_id,
    type,
    title,
    body,
    data,
    channel,
    priority,
    recipient_vitana_id
  )
  VALUES (
    NEW.receiver_id,
    v_tenant_id,
    'new_chat_message',
    v_sender_name,
    v_body_preview,
    jsonb_build_object(
      'entity_id', NEW.id::text,
      'message_id', NEW.id::text,
      'sender_id', NEW.sender_id::text,
      'sender_name', v_sender_name,
      'url', '/inbox'
    ),
    'push_and_inapp',
    'p1',
    v_recipient_vitana_id
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$$;
