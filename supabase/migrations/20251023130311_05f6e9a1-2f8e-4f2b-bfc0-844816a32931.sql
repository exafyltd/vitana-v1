-- Harden message notification triggers to prevent transaction failures

-- Drop and recreate global message notifications function with error handling
DROP FUNCTION IF EXISTS public.create_global_message_notifications() CASCADE;

CREATE OR REPLACE FUNCTION public.create_global_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- Log the message being processed
  RAISE LOG 'Creating notifications for global message: id=%, sender=%, thread=%', 
    NEW.id, NEW.sender_id, NEW.thread_id;

  -- Wrap notification creation in exception handler to prevent blocking message insert
  BEGIN
    -- Create notifications for all participants except the sender
    FOR participant_record IN 
      SELECT user_id 
      FROM public.global_thread_participants 
      WHERE thread_id = NEW.thread_id 
        AND user_id != NEW.sender_id 
        AND is_active = true
    LOOP
      BEGIN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          data,
          created_at
        ) VALUES (
          participant_record.user_id,
          'message',
          'New Message',
          substring(NEW.body, 1, 100),
          jsonb_build_object(
            'message_id', NEW.id,
            'thread_id', NEW.thread_id,
            'sender_id', NEW.sender_id,
            'context', 'global'
          ),
          NOW()
        );
        
        RAISE LOG 'Created notification for user: %', participant_record.user_id;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE LOG 'Failed to create notification for user %: %', participant_record.user_id, SQLERRM;
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Log critical error but don't abort message insert
    RAISE LOG 'Critical error in notification trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger for global messages
DROP TRIGGER IF EXISTS create_global_message_notifications_trigger ON public.global_messages;
CREATE TRIGGER create_global_message_notifications_trigger
  AFTER INSERT ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_global_message_notifications();

-- Drop and recreate tenant message notifications function with error handling
DROP FUNCTION IF EXISTS public.create_tenant_message_notifications() CASCADE;

CREATE OR REPLACE FUNCTION public.create_tenant_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- Log the message being processed
  RAISE LOG 'Creating notifications for tenant message: id=%, sender=%, thread=%, tenant=%', 
    NEW.id, NEW.sender_id, NEW.thread_id, NEW.tenant_id;

  -- Wrap notification creation in exception handler to prevent blocking message insert
  BEGIN
    -- Create notifications for all participants except the sender
    FOR participant_record IN 
      SELECT user_id 
      FROM public.thread_participants 
      WHERE thread_id = NEW.thread_id 
        AND user_id != NEW.sender_id 
        AND is_active = true
    LOOP
      BEGIN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          data,
          created_at
        ) VALUES (
          participant_record.user_id,
          'message',
          'New Message',
          substring(NEW.body, 1, 100),
          jsonb_build_object(
            'message_id', NEW.id,
            'thread_id', NEW.thread_id,
            'sender_id', NEW.sender_id,
            'tenant_id', NEW.tenant_id,
            'context', 'tenant'
          ),
          NOW()
        );
        
        RAISE LOG 'Created notification for user: %', participant_record.user_id;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE LOG 'Failed to create notification for user %: %', participant_record.user_id, SQLERRM;
      END;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    -- Log critical error but don't abort message insert
    RAISE LOG 'Critical error in notification trigger: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger for tenant messages
DROP TRIGGER IF EXISTS create_tenant_message_notifications_trigger ON public.messages;
CREATE TRIGGER create_tenant_message_notifications_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_message_notifications();