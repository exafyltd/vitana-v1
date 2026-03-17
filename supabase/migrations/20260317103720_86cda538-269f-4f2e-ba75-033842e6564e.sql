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
  IF NEW.sender_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = NEW.receiver_id
      AND type = 'new_chat_message'
      AND data->>'message_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, handle, 'Someone') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  v_body_preview := LEFT(COALESCE(NEW.content, ''), 100);

  SELECT tenant_id INTO v_tenant_id
  FROM user_tenants
  WHERE user_id = NEW.receiver_id AND is_primary = true
  LIMIT 1;

  v_tenant_id := COALESCE(v_tenant_id, NEW.tenant_id);

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
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
    'p1'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$$;