-- Create trigger function to automatically add calendar events for invite senders
CREATE OR REPLACE FUNCTION public.auto_add_sender_calendar_event()
RETURNS TRIGGER AS $$
DECLARE
  is_calendar_invite boolean := false;
  event_title text;
  event_description text;
  event_location text;
  event_start_time timestamptz;
  event_end_time timestamptz;
  event_date text;
  event_time text;
  end_date text;
  end_time text;
BEGIN
  -- Check if this is a calendar invite message
  is_calendar_invite := (
    NEW.message_type = 'calendar_invite' OR
    (NEW.message_type = 'system' AND NEW.content_data->>'eventType' = 'calendar_invite')
  );
  
  -- Only process calendar invites
  IF NOT is_calendar_invite THEN
    RETURN NEW;
  END IF;
  
  -- Extract event details from content_data
  event_title := COALESCE(
    NEW.content_data->>'title',
    CASE 
      WHEN NEW.body LIKE '%:%' THEN TRIM(split_part(NEW.body, ':', 2))
      ELSE 'Calendar Event'
    END
  );
  
  event_description := NEW.content_data->>'description';
  event_location := NEW.content_data->>'location';
  
  -- Extract date and time components
  event_date := NEW.content_data->>'date';
  event_time := COALESCE(NEW.content_data->>'time', '09:00');
  end_date := COALESCE(NEW.content_data->>'endDate', event_date);
  end_time := COALESCE(NEW.content_data->>'endTime', '10:00');
  
  -- Calculate start_time
  event_start_time := COALESCE(
    (NEW.content_data->>'start_time')::timestamptz,
    CASE 
      WHEN event_date IS NOT NULL THEN
        (event_date || ' ' || event_time)::timestamptz
      ELSE
        NEW.created_at
    END
  );
  
  -- Calculate end_time
  event_end_time := COALESCE(
    (NEW.content_data->>'end_time')::timestamptz,
    CASE
      WHEN end_date IS NOT NULL OR NEW.content_data->>'endTime' IS NOT NULL THEN
        (end_date || ' ' || end_time)::timestamptz
      ELSE
        event_start_time + interval '1 hour'
    END
  );
  
  -- Insert calendar event for sender (idempotent with ON CONFLICT)
  INSERT INTO public.calendar_events (
    user_id,
    title,
    description,
    location,
    start_time,
    end_time,
    event_type,
    status,
    priority,
    is_recurring,
    source_type,
    source_message_id,
    metadata
  ) VALUES (
    NEW.sender_id,
    event_title,
    event_description,
    event_location,
    event_start_time,
    event_end_time,
    'personal',
    'confirmed',
    'medium',
    false,
    'invite',
    NEW.id,
    jsonb_build_object(
      'auto_created', true,
      'invite_message_type', NEW.message_type,
      'created_by_trigger', true
    )
  )
  ON CONFLICT (user_id, source_message_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers on both message tables
CREATE TRIGGER auto_add_sender_calendar_event_messages
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_sender_calendar_event();

CREATE TRIGGER auto_add_sender_calendar_event_global_messages
  AFTER INSERT ON public.global_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_sender_calendar_event();