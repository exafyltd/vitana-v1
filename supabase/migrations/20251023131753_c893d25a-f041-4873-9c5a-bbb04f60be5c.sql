-- Fix notification triggers to use correct enum types and proper JSON structure

-- Update global message notifications trigger function
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
  v_type TEXT;
  v_title TEXT;
  v_preview TEXT;
BEGIN
  RAISE LOG 'Creating notifications for global message: id=%, sender=%, thread=%', NEW.id, NEW.sender_id, NEW.thread_id;
  
  BEGIN
    -- Get thread info
    SELECT type, name INTO v_thread_type, v_thread_name
    FROM public.global_message_threads
    WHERE id = NEW.thread_id;

    v_is_group := (v_thread_type = 'group');

    -- Get sender info
    SELECT display_name, avatar_url INTO v_sender_name, v_sender_avatar
    FROM public.global_community_profiles
    WHERE user_id = NEW.sender_id
    LIMIT 1;

    v_sender_name := COALESCE(v_sender_name, 'Someone');
    v_preview := LEFT(NEW.body, 100);

    -- Determine notification type and title
    IF v_is_group THEN
      v_type := 'new_group_message';
      v_title := v_sender_name || ' in ' || COALESCE(v_thread_name, 'group chat');
    ELSE
      v_type := 'new_message';
      v_title := v_sender_name;
    END IF;

    -- Create notification for each participant (except sender)
    FOR v_participant IN
      SELECT user_id
      FROM public.global_thread_participants
      WHERE thread_id = NEW.thread_id
        AND is_active = true
        AND user_id != NEW.sender_id
    LOOP
      BEGIN
        INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
        VALUES (
          v_participant.user_id,
          v_type,
          v_title,
          v_preview,
          jsonb_build_object(
            'thread_id', NEW.thread_id,
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'sender_avatar', v_sender_avatar,
            'context', 'global'
          ),
          false
        );
        RAISE LOG 'Created notification for user: %', v_participant.user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create notification for user %: %', v_participant.user_id, SQLERRM;
      END;
    END LOOP;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Critical error in global notification trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Update tenant message notifications trigger function
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
  v_type TEXT;
  v_title TEXT;
  v_preview TEXT;
BEGIN
  RAISE LOG 'Creating notifications for tenant message: id=%, sender=%, thread=%, recipient=%', NEW.id, NEW.sender_id, NEW.thread_id, NEW.recipient_id;
  
  BEGIN
    -- Get sender info
    SELECT full_name, avatar_url INTO v_sender_name, v_sender_avatar
    FROM public.profiles
    WHERE id = NEW.sender_id
    LIMIT 1;

    v_sender_name := COALESCE(v_sender_name, 'Someone');
    v_preview := LEFT(NEW.body, 100);

    -- Handle direct messages (no thread_id, has recipient_id)
    IF NEW.thread_id IS NULL AND NEW.recipient_id IS NOT NULL THEN
      v_type := 'new_message';
      v_title := v_sender_name;
      
      BEGIN
        INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
        VALUES (
          NEW.recipient_id,
          v_type,
          v_title,
          v_preview,
          jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'sender_avatar', v_sender_avatar,
            'context', 'tenant'
          ),
          false
        );
        RAISE LOG 'Created direct message notification for user: %', NEW.recipient_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Failed to create direct message notification for user %: %', NEW.recipient_id, SQLERRM;
      END;
      
    -- Handle thread messages
    ELSIF NEW.thread_id IS NOT NULL THEN
      -- Get thread info
      SELECT type, name INTO v_thread_type, v_thread_name
      FROM public.message_threads
      WHERE id = NEW.thread_id;

      v_is_group := (v_thread_type = 'group');

      -- Determine notification type and title
      IF v_is_group THEN
        v_type := 'new_group_message';
        v_title := v_sender_name || ' in ' || COALESCE(v_thread_name, 'group chat');
      ELSE
        v_type := 'new_message';
        v_title := v_sender_name;
      END IF;

      -- Create notification for each participant (except sender)
      FOR v_participant IN
        SELECT user_id
        FROM public.thread_participants
        WHERE thread_id = NEW.thread_id
          AND is_active = true
          AND user_id != NEW.sender_id
      LOOP
        BEGIN
          INSERT INTO public.notifications (user_id, type, title, message, data, is_read)
          VALUES (
            v_participant.user_id,
            v_type,
            v_title,
            v_preview,
            jsonb_build_object(
              'thread_id', NEW.thread_id,
              'message_id', NEW.id,
              'sender_id', NEW.sender_id,
              'sender_avatar', v_sender_avatar,
              'context', 'tenant'
            ),
            false
          );
          RAISE LOG 'Created thread notification for user: %', v_participant.user_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'Failed to create thread notification for user %: %', v_participant.user_id, SQLERRM;
        END;
      END LOOP;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Critical error in tenant notification trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate triggers to use updated functions
DROP TRIGGER IF EXISTS after_global_message_insert ON public.global_messages;
CREATE TRIGGER after_global_message_insert
  AFTER INSERT ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_global_message_notifications();

DROP TRIGGER IF EXISTS after_tenant_message_insert ON public.messages;
CREATE TRIGGER after_tenant_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_message_notifications();