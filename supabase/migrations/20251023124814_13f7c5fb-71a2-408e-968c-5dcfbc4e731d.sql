-- ============================================
-- Server-Side Message Notification Triggers
-- ============================================
-- These triggers ensure notifications are created even when clients are offline

-- ============================================
-- FUNCTION: Create notifications for global messages
-- ============================================
CREATE OR REPLACE FUNCTION public.create_global_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant RECORD;
  v_sender_name TEXT;
  v_sender_avatar TEXT;
  v_thread_type TEXT;
  v_thread_name TEXT;
  v_is_group BOOLEAN;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_message_preview TEXT;
BEGIN
  -- Get thread info
  SELECT type, name INTO v_thread_type, v_thread_name
  FROM public.global_message_threads
  WHERE id = NEW.thread_id;
  
  v_is_group := (v_thread_type = 'group');
  
  -- Get sender info from global_community_profiles
  SELECT display_name, avatar_url INTO v_sender_name, v_sender_avatar
  FROM public.global_community_profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;
  
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  v_message_preview := LEFT(NEW.body, 100);
  
  -- Set notification type and title
  IF v_is_group THEN
    v_notification_type := 'new_group_message';
    v_notification_title := v_sender_name || ' in ' || COALESCE(v_thread_name, 'group chat');
  ELSE
    v_notification_type := 'new_message';
    v_notification_title := v_sender_name;
  END IF;
  
  -- Create notification for each participant except sender
  FOR v_participant IN
    SELECT user_id
    FROM public.global_thread_participants
    WHERE thread_id = NEW.thread_id
      AND is_active = true
      AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read
    ) VALUES (
      v_participant.user_id,
      v_notification_type,
      v_notification_title,
      v_message_preview,
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'sender_avatar', v_sender_avatar,
        'context', 'global'
      ),
      false
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: On global_messages insert
-- ============================================
DROP TRIGGER IF EXISTS trigger_create_global_message_notifications ON public.global_messages;
CREATE TRIGGER trigger_create_global_message_notifications
  AFTER INSERT ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_global_message_notifications();

-- ============================================
-- FUNCTION: Create notifications for tenant messages
-- ============================================
CREATE OR REPLACE FUNCTION public.create_tenant_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_participant RECORD;
  v_sender_name TEXT;
  v_sender_avatar TEXT;
  v_thread_type TEXT;
  v_thread_name TEXT;
  v_is_group BOOLEAN;
  v_notification_type TEXT;
  v_notification_title TEXT;
  v_message_preview TEXT;
BEGIN
  -- Get sender info from profiles
  SELECT COALESCE(display_name, full_name), avatar_url 
  INTO v_sender_name, v_sender_avatar
  FROM public.profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;
  
  v_sender_name := COALESCE(v_sender_name, 'Someone');
  v_message_preview := LEFT(NEW.body, 100);
  
  -- Handle direct messages (no thread_id)
  IF NEW.thread_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
    -- Skip if recipient is sender
    IF NEW.recipient_id != NEW.sender_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        is_read
      ) VALUES (
        NEW.recipient_id,
        'new_message',
        v_sender_name,
        v_message_preview,
        jsonb_build_object(
          'thread_id', 'dm-' || NEW.id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'sender_avatar', v_sender_avatar,
          'context', 'tenant'
        ),
        false
      );
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle thread messages
  IF NEW.thread_id IS NOT NULL THEN
    -- Get thread info
    SELECT type, name INTO v_thread_type, v_thread_name
    FROM public.message_threads
    WHERE id = NEW.thread_id;
    
    v_is_group := (v_thread_type = 'group');
    
    -- Set notification type and title
    IF v_is_group THEN
      v_notification_type := 'new_group_message';
      v_notification_title := v_sender_name || ' in ' || COALESCE(v_thread_name, 'group chat');
    ELSE
      v_notification_type := 'new_message';
      v_notification_title := v_sender_name;
    END IF;
    
    -- Create notification for each participant except sender
    FOR v_participant IN
      SELECT user_id
      FROM public.thread_participants
      WHERE thread_id = NEW.thread_id
        AND is_active = true
        AND user_id != NEW.sender_id
    LOOP
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        is_read
      ) VALUES (
        v_participant.user_id,
        v_notification_type,
        v_notification_title,
        v_message_preview,
        jsonb_build_object(
          'thread_id', NEW.thread_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'sender_avatar', v_sender_avatar,
          'context', 'tenant'
        ),
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: On messages insert
-- ============================================
DROP TRIGGER IF EXISTS trigger_create_tenant_message_notifications ON public.messages;
CREATE TRIGGER trigger_create_tenant_message_notifications
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_message_notifications();