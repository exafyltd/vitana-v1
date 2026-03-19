CREATE OR REPLACE FUNCTION notify_on_reaction() RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_reactor_name TEXT;
  v_tenant_id UUID;
  v_body TEXT;
BEGIN
  -- Find message author across all message tables
  SELECT sender_id INTO v_author_id FROM chat_messages WHERE id = NEW.message_id;
  IF v_author_id IS NULL THEN
    SELECT sender_id INTO v_author_id FROM global_messages WHERE id = NEW.message_id;
  END IF;
  IF v_author_id IS NULL THEN
    SELECT sender_id INTO v_author_id FROM messages WHERE id = NEW.message_id;
  END IF;

  -- No author found or self-reaction: skip
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Deduplicate: skip if same reactor+message within 5 seconds
  IF EXISTS (
    SELECT 1 FROM user_notifications
    WHERE user_id = v_author_id
      AND type = 'message_reaction'
      AND data->>'reactor_id' = NEW.user_id::text
      AND data->>'message_id' = NEW.message_id::text
      AND created_at > NOW() - INTERVAL '5 seconds'
  ) THEN
    RETURN NEW;
  END IF;

  -- Get reactor display name
  SELECT COALESCE(full_name, handle, 'Someone') INTO v_reactor_name
  FROM profiles WHERE id = NEW.user_id;

  -- Get recipient tenant
  SELECT tenant_id INTO v_tenant_id
  FROM user_tenants
  WHERE user_id = v_author_id AND is_primary = true
  LIMIT 1;

  v_body := v_reactor_name || ' reacted ' || NEW.emoji || ' to your message';

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (
    v_author_id,
    v_tenant_id,
    'message_reaction',
    'New Reaction',
    v_body,
    jsonb_build_object(
      'entity_id', NEW.message_id::text,
      'message_id', NEW.message_id::text,
      'reactor_id', NEW.user_id::text,
      'reactor_name', v_reactor_name,
      'emoji', NEW.emoji,
      'url', '/inbox'
    ),
    'push_and_inapp',
    'p2'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_reaction error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_reaction
  AFTER INSERT ON message_reactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_reaction();