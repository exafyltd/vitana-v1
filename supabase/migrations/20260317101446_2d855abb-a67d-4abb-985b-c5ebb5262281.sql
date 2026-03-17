
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_body_preview TEXT;
  v_tenant_id UUID;
BEGIN
  -- Skip bot messages
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  -- Skip self-messages
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  -- Get sender display name
  SELECT COALESCE(full_name, handle, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  v_body_preview := LEFT(COALESCE(NEW.content, ''), 100);

  -- Look up receiver's primary tenant
  SELECT tenant_id INTO v_tenant_id
  FROM user_tenants
  WHERE user_id = NEW.receiver_id AND is_primary = true
  LIMIT 1;

  -- Fallback to message's tenant_id
  v_tenant_id := COALESCE(v_tenant_id, NEW.tenant_id);

  -- Deduplicate: skip if gateway already created a notification for this message
  IF EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = NEW.receiver_id
      AND type = 'new_chat_message'
      AND data->>'sender_id' = NEW.sender_id::text
      AND created_at > NEW.created_at - interval '5 seconds'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (
    NEW.receiver_id,
    v_tenant_id,
    'new_chat_message',
    'New Message',
    v_sender_name || ': ' || v_body_preview,
    jsonb_build_object(
      'entity_id', NEW.id::text,
      'sender_id', NEW.sender_id::text,
      'url', '/inbox'
    ),
    'push_and_inapp',
    'p1'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_chat_message();
